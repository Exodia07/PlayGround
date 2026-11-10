package com.playground.barakel;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.view.SurfaceView;
import android.view.SurfaceHolder;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.view.MotionEvent;
import android.view.KeyEvent;
import android.view.InputDevice;
import android.view.Surface;
import java.util.ArrayList;
import java.util.Random;

public class GameActivity extends Activity {
    private GameView game;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();
        game = new GameView();
        setContentView(game);
    }
    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(5894 | 1024 | 512 | 4096);
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }
    @Override protected void onPause() { super.onPause(); if (game != null) game.pause(); }
    @Override protected void onResume() { super.onResume(); if (game != null) game.resume(); }

    private static class Enemy {
        float x, y, hp, speed, attackTimer, hitFlash;
        int kind;
        Enemy(float x, float y, int kind) { this.x=x; this.y=y; this.kind=kind; hp=kind==2?5:kind==1?3:2; speed=kind==2?34:kind==1?47:57; }
    }
    private static class Bolt { float x,y,vx,vy,life; Bolt(float x,float y,float vx,float vy){this.x=x;this.y=y;this.vx=vx;this.vy=vy;life=1.5f;} }

    private class GameView extends SurfaceView implements SurfaceHolder.Callback, Runnable {
        static final float W=960, H=540;
        final Paint p=new Paint(3);
        final Random random=new Random(19);
        final ArrayList<Enemy> enemies=new ArrayList<>();
        final ArrayList<Bolt> bolts=new ArrayList<>();
        Thread loop;
        volatile boolean running=false;
        int mode=0, wave=1, score=0, kills=0;
        float px=480,py=280,dx=0,dy=-1,hp=100,mana=100,attackCd=0,magicCd=0,invuln=0,elapsed=0,damageFlash=0;
        float stickX=0,stickY=0,axisX=0,axisY=0;
        boolean moveUp=false,moveDown=false,moveLeft=false,moveRight=false,attack=false,cast=false;
        int movePointer=-1, attackPointer=-1, castPointer=-1;
        float moveOriginX=105,moveOriginY=440,thumbX=105,thumbY=440;
        long lastFrame=0;
        float renderScale=1,renderOffsetX=0,renderOffsetY=0;
        GameView() { super(GameActivity.this); getHolder().addCallback(this); setFocusable(true); setFocusableInTouchMode(true); }
        @Override public void surfaceCreated(SurfaceHolder h) { startLoop(); }
        @Override public void surfaceChanged(SurfaceHolder h,int f,int w,int hh) {}
        @Override public void surfaceDestroyed(SurfaceHolder h) { stopLoop(); }
        void startLoop(){ if(loop==null){running=true;loop=new Thread(this,"BarakelLoop");loop.start();} }
        void stopLoop(){running=false;if(loop!=null){try{loop.join(500);}catch(Exception ignored){}loop=null;} }
        void pause(){ if(loop!=null) stopLoop(); }
        void resume(){ if(getHolder().getSurface().isValid()) startLoop(); }
        @Override public void run(){
            lastFrame=System.nanoTime();
            while(running){
                long now=System.nanoTime(); float dt=Math.min(.04f,(now-lastFrame)/1_000_000_000f); lastFrame=now;
                update(dt); Canvas c=null;
                try { c=getHolder().lockCanvas(); if(c!=null) drawGame(c); }
                catch(Exception ignored){} finally { if(c!=null) getHolder().unlockCanvasAndPost(c); }
                try { Thread.sleep(12); } catch(InterruptedException ignored){}
            }
        }
        void begin(){ mode=1;wave=1;score=0;kills=0;hp=100;mana=100;px=480;py=280;dx=0;dy=-1;enemies.clear();bolts.clear();spawnWave(); }
        void spawnWave(){ int amount=wave==1?5:wave==2?7:wave==3?8:0; for(int i=0;i<amount;i++){float a=(float)(i*Math.PI*2/amount)+.3f;float r=240+random.nextInt(35);int kind=wave>=3&&i==0?2:random.nextInt(4)==0?1:0;enemies.add(new Enemy(clamp(px+(float)Math.cos(a)*r,40,920),clamp(py+(float)Math.sin(a)*r,55,485),kind));} if(wave==4) enemies.add(new Enemy(735,270,2)); }
        float clamp(float v,float lo,float hi){return Math.max(lo,Math.min(hi,v));}
        void update(float dt){
            elapsed+=dt; attackCd=Math.max(0,attackCd-dt);magicCd=Math.max(0,magicCd-dt);invuln=Math.max(0,invuln-dt);damageFlash=Math.max(0,damageFlash-dt);
            if(mode!=1)return;
            float mx=axisX+(moveRight?1:0)-(moveLeft?1:0)+stickX;
            float my=axisY+(moveDown?1:0)-(moveUp?1:0)+stickY;
            float len=(float)Math.hypot(mx,my); if(len>1){mx/=len;my/=len;}
            if(len>.12f){px+=mx*178*dt;py+=my*178*dt;dx=mx;dy=my;}
            px=clamp(px,36,924);py=clamp(py,64,480);
            if(attack&&attackCd<=0) melee();
            if(cast&&magicCd<=0) castMagic();
            for(int i=bolts.size()-1;i>=0;i--){Bolt b=bolts.get(i);b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;boolean hit=false;
                for(int j=enemies.size()-1;j>=0;j--){Enemy e=enemies.get(j);if(distance(b.x,b.y,e.x,e.y)<25){e.hp-=2;e.hitFlash=.14f;hit=true;if(e.hp<=0) defeat(j);break;}}
                if(hit||b.life<=0||b.x<0||b.x>W||b.y<0||b.y>H)bolts.remove(i);
            }
            for(int i=enemies.size()-1;i>=0;i--){Enemy e=enemies.get(i);e.hitFlash=Math.max(0,e.hitFlash-dt);float vx=px-e.x,vy=py-e.y,d=(float)Math.hypot(vx,vy);if(d>30){e.x+=vx/d*e.speed*dt;e.y+=vy/d*e.speed*dt;}else{e.attackTimer-=dt;if(e.attackTimer<=0){e.attackTimer=.9f;if(invuln<=0){hp-=e.kind==2?13:8;invuln=.65f;damageFlash=.2f;if(hp<=0){hp=0;mode=3;}}}}
            }
            if(enemies.isEmpty()){if(wave<4){wave++;mana=Math.min(100,mana+25);spawnWave();}else mode=2;}
            mana=Math.min(100,mana+2.5f*dt);
        }
        void melee(){attackCd=.34f;float reach=86;for(int i=enemies.size()-1;i>=0;i--){Enemy e=enemies.get(i);float vx=e.x-px,vy=e.y-py,d=(float)Math.hypot(vx,vy);if(d<reach&&((vx*dx+vy*dy)/Math.max(1,d))>.12f){e.hp-=2;e.hitFlash=.16f;if(e.hp<=0)defeat(i);}}}
        void castMagic(){if(mana<30){magicCd=.25f;return;}mana-=30;magicCd=.38f;float d=(float)Math.hypot(dx,dy);if(d<.1f){dx=0;dy=-1;d=1;}bolts.add(new Bolt(px+dx*22,py+dy*22,dx/d*340,dy/d*340));}
        void defeat(int index){enemies.remove(index);score+=100+wave*25;kills++;}
        float distance(float x,float y,float a,float b){return (float)Math.hypot(x-a,y-b);}
        @Override public boolean onTouchEvent(MotionEvent e){
            float x=(e.getX()-renderOffsetX)/renderScale,y=(e.getY()-renderOffsetY)/renderScale;int action=e.getActionMasked(),idx=e.getActionIndex(),id=e.getPointerId(idx);
            if(action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_POINTER_DOWN){
                if(mode!=1){begin();return true;}
                if(x<260&&y>300){movePointer=id;moveOriginX=105;moveOriginY=440;setStick(x,y);}
                else if(x>805&&y>320){attackPointer=id;attack=true;}
                else if(x>660&&y>320){castPointer=id;cast=true;}
                else if(x>W-80&&y<80){mode=0;}
                return true;
            }
            if(action==MotionEvent.ACTION_MOVE){for(int i=0;i<e.getPointerCount();i++){int pid=e.getPointerId(i);float tx=(e.getX(i)-renderOffsetX)/renderScale,ty=(e.getY(i)-renderOffsetY)/renderScale;if(pid==movePointer)setStick(tx,ty);}return true;}
            if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_POINTER_UP||action==MotionEvent.ACTION_CANCEL){int pid=e.getPointerId(idx);if(pid==movePointer){movePointer=-1;stickX=stickY=0;thumbX=moveOriginX;thumbY=moveOriginY;}if(pid==attackPointer){attackPointer=-1;attack=false;}if(pid==castPointer){castPointer=-1;cast=false;}return true;}
            return true;
        }
        void setStick(float x,float y){float vx=x-moveOriginX,vy=y-moveOriginY,d=(float)Math.hypot(vx,vy);if(d>62){vx=vx/d*62;vy=vy/d*62;}thumbX=moveOriginX+vx;thumbY=moveOriginY+vy;stickX=vx/62;stickY=vy/62;}
        @Override public boolean onKeyDown(int key,KeyEvent e){
            switch(key){case KeyEvent.KEYCODE_DPAD_UP:case KeyEvent.KEYCODE_W:moveUp=true;return true;case KeyEvent.KEYCODE_DPAD_DOWN:case KeyEvent.KEYCODE_S:moveDown=true;return true;case KeyEvent.KEYCODE_DPAD_LEFT:case KeyEvent.KEYCODE_A:moveLeft=true;return true;case KeyEvent.KEYCODE_DPAD_RIGHT:case KeyEvent.KEYCODE_D:moveRight=true;return true;
                case KeyEvent.KEYCODE_BUTTON_A:case KeyEvent.KEYCODE_SPACE:case KeyEvent.KEYCODE_BUTTON_R1:attack=true;return true;case KeyEvent.KEYCODE_BUTTON_X:case KeyEvent.KEYCODE_BUTTON_B:case KeyEvent.KEYCODE_BUTTON_L1:cast=true;return true;case KeyEvent.KEYCODE_ENTER:case KeyEvent.KEYCODE_BUTTON_START:if(mode!=1)begin();return true;case KeyEvent.KEYCODE_BACK:mode=0;return true;}
            return super.onKeyDown(key,e);
        }
        @Override public boolean onKeyUp(int key,KeyEvent e){
            switch(key){case KeyEvent.KEYCODE_DPAD_UP:case KeyEvent.KEYCODE_W:moveUp=false;return true;case KeyEvent.KEYCODE_DPAD_DOWN:case KeyEvent.KEYCODE_S:moveDown=false;return true;case KeyEvent.KEYCODE_DPAD_LEFT:case KeyEvent.KEYCODE_A:moveLeft=false;return true;case KeyEvent.KEYCODE_DPAD_RIGHT:case KeyEvent.KEYCODE_D:moveRight=false;return true;case KeyEvent.KEYCODE_BUTTON_A:case KeyEvent.KEYCODE_SPACE:case KeyEvent.KEYCODE_BUTTON_R1:attack=false;return true;case KeyEvent.KEYCODE_BUTTON_X:case KeyEvent.KEYCODE_BUTTON_B:case KeyEvent.KEYCODE_BUTTON_L1:cast=false;return true;}
            return super.onKeyUp(key,e);
        }
        @Override public boolean onGenericMotionEvent(MotionEvent e){
            if((e.getSource()&InputDevice.SOURCE_JOYSTICK)==InputDevice.SOURCE_JOYSTICK&&e.getAction()==MotionEvent.ACTION_MOVE){axisX=axis(e,MotionEvent.AXIS_X,MotionEvent.AXIS_HAT_X);axisY=axis(e,MotionEvent.AXIS_Y,MotionEvent.AXIS_HAT_Y);return true;}return super.onGenericMotionEvent(e);
        }
        float axis(MotionEvent e,int main,int hat){float v=e.getAxisValue(main);if(Math.abs(v)<.2f)v=e.getAxisValue(hat);return Math.abs(v)<.2f?0:clamp(v,-1,1);}
        void drawGame(Canvas real){
            renderScale=Math.min(real.getWidth()/W,real.getHeight()/H);renderOffsetX=(real.getWidth()-W*renderScale)/2;renderOffsetY=(real.getHeight()-H*renderScale)/2;
            real.drawColor(Color.rgb(8,10,12));real.save();real.translate(renderOffsetX,renderOffsetY);real.scale(renderScale,renderScale);
            if(mode==0)drawTitle(real);else{drawArena(real);drawHud(real);if(mode==2)drawEnd(real,true);if(mode==3)drawEnd(real,false);}
            real.restore();
        }
        void drawTitle(Canvas c){
            c.drawRect(0,0,W,H,grad(0,0,0,H,0xff121a21,0xff251511));
            for(int i=0;i<32;i++){float x=(i*173+57)%W,y=(i*97+21)%H; p.setColor(i%3==0?0x443b6a76:0x332d4b52);c.drawCircle(x,y,18+(i%5)*8,p);}
            c.drawCircle(480,237,146,radial(480,237,5,146,0x66e8a84b,0x00101010));
            drawRuin(c,185,305,1);drawRuin(c,780,300,-1);drawHero(c,480,286,0,-1,true);
            text(c,"BARAKEL",480,111,58,0xfff0d7a2,true);text(c,"THE FALLEN ANGEL",480,148,19,0xffb5c5c6,true);
            line(c,330,168,630,168,0xff97744a,2);
            text(c,"A forgotten shrine stirs beneath the ash.",480,374,19,0xffd0c4aa,false);
            text(c,"ENTER THE RUIN",480,440,20,0xffffcf76,true);
            text(c,"TAP   •   PRESS START / A",480,478,13,0xffa5aaab,true);
            text(c,"MOVE: STICK / D-PAD     ATTACK: A     SPELL: X",480,516,12,0xff7d8b8b,true);
        }
        Shader grad(float x1,float y1,float x2,float y2,int a,int b){return new LinearGradient(x1,y1,x2,y2,a,b,Shader.TileMode.CLAMP);}
        Shader radial(float x,float y,float r1,float r2,int a,int b){return new RadialGradient(x,y,new float[]{r1,r2},new int[]{a,b},Shader.TileMode.CLAMP);}
        void text(Canvas c,String s,float x,float y,float size,int color,boolean bold){p.setShader(null);p.setColor(color);p.setTextSize(size);p.setTypeface(bold?Typeface.create("serif",Typeface.BOLD):Typeface.create("sans-serif",Typeface.NORMAL));p.setTextAlign(Paint.Align.CENTER);p.setShadowLayer(bold?4:0,0,2,0xff090909);c.drawText(s,x,y,p);p.clearShadowLayer();}
        void line(Canvas c,float x1,float y1,float x2,float y2,int color,float width){p.setShader(null);p.setColor(color);p.setStrokeWidth(width);p.setStrokeCap(Paint.Cap.ROUND);c.drawLine(x1,y1,x2,y2,p);}
        void circle(Canvas c,float x,float y,float r,int color){p.setShader(null);p.setColor(color);c.drawCircle(x,y,r,p);}
        void round(Canvas c,float l,float t,float r,float b,float radius,int color){p.setShader(null);p.setColor(color);c.drawRoundRect(l,t,r,b,radius,radius,p);}
        void drawArena(Canvas c){
            c.drawRect(0,0,W,H,grad(0,0,W,H,0xff293a31,0xff18231f));
            p.setShader(radial(480,260,5,520,0xff514b35,0xff111a19));c.drawRect(0,0,W,H,p);p.setShader(null);
            // worn flagstones and weeds add texture without reducing clarity
            for(int row=0;row<8;row++)for(int col=0;col<13;col++){
                float x=col*82+(row%2)*37-24,y=52+row*66;int shade=((row*17+col*13)%5);
                p.setColor(new int[]{0x1833b5a0,0x183b9c8b,0x1e8e8162,0x153fa69a,0x1e172c2a}[shade]);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1);c.drawRoundRect(x,y,x+72,y+55,8,8,p);p.setStyle(Paint.Style.FILL);
                if((row*7+col*11)%9==0){circle(c,x+16,y+18,2,0x66849a62);circle(c,x+20,y+18,2,0x66849a62);}
            }
            // ancient paving / altar
            round(c,385,176,575,347,22,0x443c2e20);round(c,398,187,562,333,16,0x77211817);round(c,411,199,549,320,12,0x88392b22);
            circle(c,480,260,47,0x552f1d14);circle(c,480,256,33,0x66d38b39);circle(c,480,256,18,0xff271d19);circle(c,480,256,6,0xffe6bc62);
            drawRuin(c,56,131,1);drawRuin(c,900,139,-1);drawRuin(c,126,464,1);drawRuin(c,835,456,-1);
            for(Bolt b:bolts){circle(c,b.x,b.y,11,0x668dd8ff);circle(c,b.x,b.y,6,0xffd8f6ff);}
            for(Enemy e:enemies)drawEnemy(c,e);
            drawHero(c,px,py,dx,dy,invuln>0);
            if(damageFlash>0){p.setColor(0x33ff2d24);c.drawRect(0,0,W,H,p);}
        }
        void drawRuin(Canvas c,float x,float y,float side){
            c.save();c.translate(x,y);c.scale(side,1);
            p.setShader(null);p.setColor(0x55391d16);c.drawRect(-22,-34,22,10,p);p.setColor(0xff393c36);c.drawRect(-19,-36,-8,3,p);c.drawRect(6,-43,18,3,p);p.setColor(0xff55564b);c.drawRect(-24,-40,-6,-34,p);c.drawRect(3,-47,22,-41,p);p.setColor(0xff8e8063);c.drawRect(-15,-31,-12,-12,p);c.drawRect(11,-38,14,-16,p);p.setColor(0xff252b25);c.drawRect(-10,-25,7,5,p);c.restore();
        }
        void drawHero(Canvas c,float x,float y,float vx,float vy,boolean hurt){
            c.save();c.translate(x,y);float angle=(float)Math.toDegrees(Math.atan2(vy,vx))+90;c.rotate(angle);
            circle(c,0,9,17,0x55201814);
            p.setShader(grad(-14,-4,14,16,0xff653b3b,0xff211d28));p.setColor(Color.WHITE);c.drawOval(-15,-8,15,19,p);p.setShader(null);
            // ivory mantle and dark armor
            p.setColor(0xffc7bca0);c.drawOval(-11,-15,11,11,p);p.setColor(0xff31404b);c.drawRoundRect(-8,-12,8,12,5,5,p);
            circle(c,0,-13,8,hurt?0xffffaaaa:0xffe6c58e);circle(c,0,-13,5,0xffd9d4c1);circle(c,0,-13,2,0xff28313b);
            // winged shoulder details and sword
            p.setColor(0xffd3c7a6);c.drawOval(-17,-18,-8,-8,p);c.drawOval(8,-18,17,-8,p);
            line(c,7,0,23,-14,0xffd6d5c9,4);line(c,3,2,12,-7,0xffb48d58,3);
            circle(c,0,-29,4,0xffffd78b);circle(c,0,-29,2,0xfffff2c7);
            c.restore();
        }
        void drawEnemy(Canvas c,Enemy e){
            c.save();c.translate(e.x,e.y);circle(c,0,10,e.kind==2?25:17,0x66301412);
            if(e.kind==2){
                p.setColor(e.hitFlash>0?0xffffb3a5:0xff632c36);c.drawOval(-23,-28,23,21,p);p.setColor(0xffb24845);c.drawOval(-19,-18,19,17,p);p.setColor(0xff3d2933);c.drawOval(-12,-34,12,-8,p);p.setColor(0xffe1ad62);c.drawRect(-19,-31,-13,-43,p);c.drawRect(13,-31,19,-43,p);circle(c,-7,-13,3,0xffffca65);circle(c,7,-13,3,0xffffca65);line(c,-9,16,-14,25,0xff9a4944,5);line(c,9,16,14,25,0xff9a4944,5);
            }else if(e.kind==1){
                p.setColor(e.hitFlash>0?0xffffc1a8:0xff6e794d);c.drawOval(-16,-22,16,18,p);p.setColor(0xff5d5547);c.drawRect(-14,-19,14,-7,p);p.setColor(0xffffd28c);c.drawRect(-10,-17,-5,-13,p);c.drawRect(5,-17,10,-13,p);line(c,-13,15,-18,23,0xff6e794d,6);line(c,13,15,18,23,0xff6e794d,6);
            }else{
                p.setColor(e.hitFlash>0?0xffffddd0:0xff77716a);c.drawOval(-13,-20,13,17,p);p.setColor(0xffb9b29d);c.drawOval(-10,-22,10,-9,p);circle(c,-4,-15,2,0xffd74439);circle(c,4,-15,2,0xffd74439);line(c,-8,13,-12,22,0xff8c8679,4);line(c,8,13,12,22,0xff8c8679,4);
            }
            c.restore();
            if(e.kind==2){round(c,e.x-28,e.y-40,e.x+28,e.y-35,3,0xff341b1a);round(c,e.x-28,e.y-40,e.x-28+56*(e.hp/5f),e.y-35,3,0xffd45e4c);}
        }
        void drawHud(Canvas c){
            p.setShader(grad(0,0,0,74,0xee101619,0x00101619));c.drawRect(0,0,W,74,p);p.setShader(null);
            text(c,"BARAKEL",94,27,19,0xffe6d3ad,true);text(c,"SHRINE  •  WAVE "+wave+" / 4",170,51,12,0xffaeb9ad,true);
            round(c,238,17,438,31,7,0xff302827);round(c,240,19,240+194*hp/100f,29,5,hp<30?0xffd95048:0xffb6584b);text(c,"VITALITY",338,47,11,0xffddc7b1,true);
            round(c,462,17,632,31,7,0xff232c33);round(c,464,19,464+166*mana/100f,29,5,0xff64b1c2);text(c,"AETHER",548,47,11,0xffb4d2d7,true);
            text(c,"SOULS  "+score,764,28,15,0xffe5cb91,true);text(c,"FOES  "+enemies.size(),764,49,12,0xffb3b8ad,true);
            round(c,905,12,944,54,10,0x883b4642);text(c,"Ⅱ",924,39,20,0xffe7dcbf,true);
            // touch controls are unobtrusive and remain anchored to the corners
            circle(c,105,440,59,0x3cdae2df);circle(c,105,440,42,0x2aebe3ce);circle(c,thumbX,thumbY,23,0x88e9e1d0);circle(c,thumbX-5,thumbY-6,6,0x66ffffff);
            circle(c,724,438,39,0x5888dff0);circle(c,724,438,31,0x227fd2ed);text(c,"✦",724,447,29,0xffc7f5ff,true);text(c,"X",724,487,12,0xffd1e4e6,true);
            circle(c,850,426,49,0x66e8a05b);circle(c,850,426,38,0x33ffd18a);text(c,"⚔",850,438,31,0xffffe2b4,true);text(c,"A",850,487,12,0xffeed9bd,true);
        }
        void drawEnd(Canvas c,boolean won){
            p.setColor(0xb90a0d10);c.drawRect(0,0,W,H,p);round(c,267,122,693,420,22,0xee1b2222);
            line(c,320,177,640,177,0xff90734b,2);text(c,won?"THE VEIL IS LIFTED":"FALLEN IN THE ASH",480,218,31,won?0xffffd888:0xffe5a099,true);
            text(c,won?"The shrine grows quiet. The lost souls are free.":"The darkness closes around the shrine.",480,265,16,0xffd1d1c3,false);
            text(c,"SOULS RELEASED   "+score,480,310,16,0xffe7cc96,true);text(c,"TAP   •   PRESS START / A TO PLAY AGAIN",480,367,14,0xffd5e0dc,true);
        }
    }
}
