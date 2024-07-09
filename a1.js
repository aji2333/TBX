//公式区
//获取圆角半径
function r(a){
    if(a<=1.0)
    {
        return a/2;
    }
    if(a>1.0 && a<=1.6)
    {
        return 0.5;
    }
    if(a>1.6 && a<=2.24)
    {
        return 0.65;
    }
    if(a>2.24 && a<=3.55)
    {
        return 0.8;
    }
    if(a>3.55 && a<=5.6)
    {
        return 1.0;
    }
    if(a>5.6 && a<=7.1)
    {
        return 1.2;
    }
    if(a>7.1 && a<=8)
    {
        return 1.5;
    }
}
//标准值
function biao(a){
    return 0.8584*(r(a)**2);
}
//最大值
function zui(a){
    if (r(a) == 0.65){
        return 0.566678;
    }else if(a<=1.0){
        return biao(a);
    }else{
    return 0.8584*((r(a)*1.25)**2);
    }
}
//三变偏差
function pians(a){
    if(a<=3.15)
    {
        return 0.03;
    }
    if(a>3.15 && a<=6.3)
    {
        return 0.05;
    }
    if(a>6.3 && a<=12.5)
    {
        return 0.06;
    }
    if(a>12.5 && a<=16)
    {
        return 0.07;
    }
}
//国标偏差
function pian(a){
    if(a<=3.15)
    {
        return 0.03;
    }
    if(a>3.15 && a<=6.3)
    {
        return 0.05;
    }
    if(a>6.3 && a<=12.5)
    {
        return 0.07;
    }
    if(a>12.5 && a<=16)
    {
        return 0.1;
    }
    if(a>16)
    {
        return 0.1;
    }
}
//四舍五入
function qy(num,bit){
    return Math.round(num * (10**bit))/(10**bit)
}
//不四舍五入
function bqy(num,bit){
    return Math.floor(num * (10**bit))/(10**bit)
}
//三变正公差r20
function sbr20(a,b){
    return bqy((0.017241/(a*b-bqy(zui(a),4)))*100000,2);
}
//三变c1硬度算法
function sbc1(a,b){
    return bqy((0.017241/((a-pians(a))*(b-pians(b))-bqy(zui(a),4)))*100000,2);
}
//三变c2硬度算法
function sbc2(a,b){
    return bqy((0.017391/((a-pians(a))*(b-pians(b))-bqy(zui(a),4)))*100000,2);
}
//三变c3硬度算法
function sbc3(a,b){
    return bqy((0.017544/((a-pians(a))*(b-pians(b))-bqy(zui(a),4)))*100000,2);
}
//普通线r20
function r20(a,b){
    if (qy(0.0172413/((a-pian(a))*(b-pian(b))-zui(a))*100000,2)!=0){
        return qy(0.0172413/((a-pian(a))*(b-pian(b))-zui(a))*100000,2);
    }else{
        return 0.0172413/((a-pian(a))*(b-pian(b))-zui(a))*100000;
    }
}

//温度系数高精度
function wendug(a){
    return bqy(254.5/(234.5+a),5);
}
//温度系数低精度
function wendud(a){
    return bqy(1/(1+0.00393*(a-20)),5);
}
//普通线称重
function Ss(w,h){
    return qy(w/h/8.89*1000,2);
}
//明珠线称重
function Sm(w,h){
    return qy(w/h/8.9*1000,2);
}
//实际电阻(低精度)
function jisuan1(a,b){
    if (qy(wendud(a)*b,2)!=0){
        return qy(wendud(a)*b,2);
    }else{
        return wendud(a)*b;
    }
}
//实际电阻(高精度)
function jisuan2(a,b){
    if (qy(wendug(a)*b,2)!=0){
        return qy(wendug(a)*b,2);
    }else{
        return wendug(a)*b;
    }
}
//计算标准面积
function biaoS(a,b,c){
    if (c=='')
    {
        return qy(a*b-biao(a),2)
    }
    else{
        return qy(a*b-biao(c),2)
    }
}
//计算电阻率
function cal(a,b){
    return Math.round(a*b);
}
//计算电阻平衡率
function ping1(a,b){
    if (b<a){
        [a,b]=[b,a];
        return Decimal(b).sub(Decimal(a)).div(Decimal(b)).mul(Decimal('100'));
    }else {
        return Decimal(b).sub(Decimal(a)).div(Decimal(b)).mul(Decimal('100'));
    }
}
function ping2(a,b){
    if (b<a){
        [a,b]=[b,a];
        return Decimal('2').mul(Decimal(b).sub(Decimal(a)).div(Decimal(a).add(Decimal(b)))).mul(Decimal('100'));
    }else{
        return Decimal('2').mul(Decimal(b).sub(Decimal(a)).div(Decimal(a).add(Decimal(b)))).mul(Decimal('100'));
    }
}


function kl(a,b){
    return qy(a/b,3)*1000;
}

function Random(max, min) {
        const arrayRange=(start,stop,step)=>
        Array.from(
        {length:(stop-start)/step+1},
              (value,index)=>start+index*step
        );
        let arr = arrayRange(min,max,1);
        let index=Math.floor((Math.random()*arr.length));
    return arr[index];
}

function cezhi(a,b){
    return qy(a*b/1000,2)
}

const debounce = function(fn,t){
        let timer
        return function(...args){
        if(timer) clearTimeout(timer)
                timer = setTimeout(() => {
                fn(...args)
                },t)
        }
};


//应用区
const a=document.getElementById("a");
const b=document.getElementById("b");
const r2=document.getElementById("r20");
const sr2=document.getElementById("sr20");//三变正公差
const c1=document.getElementById("c1");
const c2=document.getElementById("c2");
const c3=document.getElementById("c3");
const c=document.getElementById("c");
const b1=document.getElementById("biao");
const wd=document.getElementById("wendu");
const ce=document.getElementById("ce");
const shi=document.getElementById("shi");//实际值
const w=document.getElementById("w");//称重
const h=document.getElementById("h");//长度
const p=document.getElementById("p");//称重面积
const s1=document.getElementById("s1");
const p1=document.getElementById("p1");
const s2=document.getElementById("s2");
const ji1=document.getElementById("ji1");
const ji2=document.getElementById("ji2");
const ph1=document.getElementById("ph1");
const ph2=document.getElementById("ph2");
const la=document.getElementById("la");
const kl1=document.getElementById("kl");
const cz=document.getElementById("cz");
function update(){
    if (a.value !='' && b.value != ''){
        r2.value=r20(parseFloat(a.value),parseFloat(b.value));
        sr2.value=sbr20(parseFloat(a.value),parseFloat(b.value));
        c1.value=sbc1(parseFloat(a.value),parseFloat(b.value));
        c2.value=sbc2(parseFloat(a.value),parseFloat(b.value));
        c3.value=sbc3(parseFloat(a.value),parseFloat(b.value));
    }
    if (a.value != '' && b.value != ''&& c.value != ''){
        b1.value=biaoS(parseFloat(a.value),parseFloat(b.value),parseFloat(c.value));
    }
    if (c.value==''&&a.value != '' && b.value != ''){
        b1.value=biaoS(parseFloat(a.value),parseFloat(b.value),'');
    }
    if (a.value==''||b.value==''){
        r2.value=''
        b1.value=''
    }


}
function update1(){
    if (wd.value != '' && ce.value != ''){
        shi.value=jisuan1(parseFloat(wd.value),parseFloat(ce.value))
    }
    if (wd.value==''||ce.value==''){
        shi.value=''
    }
}
function update2(){
    if (shi.value!='' && p.value!=''){
        s1.value=cal(parseFloat(shi.value),parseFloat(p.value))
    }
    if (shi.value!='' && p1.value!=''){
        s2.value=cal(parseFloat(shi.value),parseFloat(p1.value))
    }
    if (p.value==''||shi.value==''){
        s1.value=''
    }
    if (p1.value==''||shi.value==''){
        s2.value=''
    }
}
function update3(){
    if (w.value != '' && h.value != ''){
        p.value=Ss(parseFloat(w.value),parseFloat(h.value))
        p1.value=Sm(parseFloat(w.value),parseFloat(h.value))
    }
    if (shi.value!='' && p.value!=''){
        s1.value=cal(parseFloat(shi.value),parseFloat(p.value))
    }
    if (shi.value!='' && p1.value!=''){
        s2.value=cal(parseFloat(shi.value),parseFloat(p1.value))
    }
    if (w.value == '' || h.value == ''){
        p.value='';
        p1.value='';
    }
    if (p.value==''||shi.value==''){
        s1.value=''
    }
    if (p1.value==''||shi.value==''){
        s2.value=''
    }
}

function update4(){
    if (ji1.value!=''&&ji2.value!=''){
        ph1.value=ping1(ji1.value,ji2.value);
        ph2.value=ping2(ji1.value,ji2.value);
    }
    if (ji1.value==''||ji2.value==''){
        ph1.value='';
        ph2.value='';
    }
}

ji=debounce(update4,300)

function update5(){
    if (la.value!=''&&p.value!=''){
        kl1.value=kl(parseFloat(la.value),parseFloat(p.value));
    }
    if (la.value==''&&p.value==''&&c1.value==''){
        kl1.value=''
    }
}

function update6(){
    if(la.value==''&&a.value!=''||c.value!='')
    {
        if(c.value=='')
        {
            if (a.value<=1)
            {
                kl1.value=Random(275,264);
            }
            if (a.value>1&&a.value<=2)
            {
                kl1.value=Random(263,255);
            }
            if (a.value>2&&a.value<=3)
            {
                kl1.value=Random(255,248);
            }
            if (a.value>3&&a.value<=4)
            {
                kl1.value=Random(249,244);
            }
            if (a.value>4&&a.value<=5)
            {
                kl1.value=Random(245,239);
            }
            if (a.value>5&&a.value<=6)
            {
                kl1.value=Random(241,237);
            }
            if (a.value>6&&a.value<=7)
            {
                kl1.value=Random(239,236);
            }
            if (a.value>7)
            {
                kl1.value=236;
            }
        }
        else if (c.value!='')
        {
            if (c.value<=1.0)
            {
                kl1.value=Random(275,264);
            }
            if (c.value>1&&c.value<=2)
            {
                kl1.value=Random(263,255);
            }
            if (c.value>2&&c.value<=3)
            {
                kl1.value=Random(255,248);
            }
            if (c.value>3&&c.value<=4)
            {
                kl1.value=Random(249,244);
            }
            if (c.value>4&&c.value<=5)
            {
                kl1.value=Random(246,239);
            }
            if (c.value>5&&c.value<=6)
            {
                kl1.value=Random(241,237);
            }
            if (c.value>6&&c.value<=7)
            {
                kl1.value=Random(239,236);
            }
            if (c.value>7)
            {
                kl1.value=236;
            }
        }
    }
    if (a.value==''&&c.value==''&&la.value=='')
    {
        kl1.value=''
    }
}

function update7(){
    if(b1.value!=''&&kl1.value!=''){
        cz.value=cezhi(parseFloat(b1.value),parseFloat(kl1.value))
    }
    if(b1.value==''||kl1.value==''){
        cz.value=''
    }
}
//清空输入框
function clear(e){
    if (e.target.value.length==0){
        e.target.value='';
    }
}

a.addEventListener('input',update)
a.addEventListener('input',update6)
a.addEventListener('input',update7)
b.addEventListener('input',update)
b.addEventListener('input',update7)
c.addEventListener('input',update)
c.addEventListener('input',update6)
c.addEventListener('input',update7)
b1.addEventListener('input',update7)
wd.addEventListener('input',update1)
ce.addEventListener('input',update1)
w.addEventListener('input',update3)
w.addEventListener('input',update5)
w.addEventListener('input',update7)
h.addEventListener('input',update3)
h.addEventListener('input',update5)
h.addEventListener('input',update7)
shi.addEventListener('input',update2)
p.addEventListener('input',update2)
p.addEventListener('input',update5)
p1.addEventListener('input',update2)
ji1.addEventListener('input',ji)
ji2.addEventListener('input',ji)
la.addEventListener('input',update5)
la.addEventListener('input',update6)
kl1.addEventListener('input',update7)
window.addEventListener('input',clear);
