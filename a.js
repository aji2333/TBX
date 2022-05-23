function R20(obj){
    var v=0.0172413;
    //var v=1/58;
    var a=document.getElementById("a");
    var b=document.getElementById("b");
    var v2=0.01720;
    if(a.value=='')
    {
	c.value='';
    }
    if(a.value!=''&&b.value!='')
    {
    if(a.value<=3.15)
    {
        var a1=0.03
    }
    if(a.value>3.15 && a.value<=6.3)
    {
        var a1=0.05
    }
    if(a.value>6.3 && a.value<=12.5)
    {
        var a1=0.07
    }
    if(b.value<=3.15)
    {
        var b1=0.03
    }
    if(b.value>3.15 && b.value<=6.3)
    {
        var b1 = 0.05
    }
    if(b.value>6.3 && b.value<=12.5)
    {
        var b1=0.07
    }
    if(b.value>12.5 && b.value<=16)
    {
        var b1=0.1
    }
    /* if(a.value==0.8)
    {
        var i=0.137344
	var i1=0.1373
	var i2=0.14
    }
    (a.value==0.85)
    {
        var i=0.1550485
	var i1=0.155
	var i2=0.16
    }
    if(a.value==0.9)
    {
        var i=0.173826
	var i1=0.1738
	var i2=0.17
    }
    if(a.value==0.95)
    {
        var i=0.1936765
	var i1=0.1936
	var i2=0.19
    }
    if(a.value==1)
    {
        var i=0.2146
	var i1=0.2146
	var i2=0.21
    }
    if(a.value>1 && a.value<=1.6)
    {
        var i=0.3353125
	var i1=0.2146
	var i2=0.21
    }
    if(a.value>1.6 && a.value<=2.24)
    {
        var i=0.566678
	var i1=0.3626
	var i2=0.36
    }
    if(a.value>2.24 && a.value<=3.55)
    {
        var i=0.8584
	var i1=0.5493
	var i2=0.55
    }
    if(a.value>3.55 && a.value<=5.6)
    {
        var i=1.34125
	var i1=0.8584
	var i2=0.86
    }
    if(a.value>5.6 && a.value<=7.1)
    {
        var i=1.9314
	var i1=1.236
	var i2=1.24
    }
    if(a.value>7.1 && a.value<=8)
    {
        var i=3.0178125
	var i1=1.9314
	var i2=1.93
    } */
    if(a.value<=1.0)
    {
        var r=parseFloat(a.value)/2;
        var rp=parseFloat(a.value)/2;
    }
    if(a.value>1.0 && a.value<=1.6)
    {
        var r=0.5;
        var rp=0.5*1.25;
    }
    if(a.value>1.6 && a.value<=2.24)
    {
        var r=0.65;
        var rp=0.65*1.25;
    }
    if(a.value>2.24 && a.value<=3.55)
    {
        var r=0.8;
        var rp=0.8*1.25;
    }
    if(a.value>3.55 && a.value<=5.6)
    {
        var r=1.0;
        var rp=1.0*1.25;
    }
    if(a.value>5.6 && a.value<=7.1)
    {
        var r=1.2;
        var rp=1.2*1.25;
    }
    if(a.value>7.1 && a.value<=8)
    {
	var r=1.5
	var rp=r*1.25
    }
    let i=0.8584*(rp**2);
    let i2=0.8584*(r**2);
    var v1=v/((parseFloat(a.value)-a1)*(parseFloat(b.value)-b1)-i)*100000;
    v1=v1.toFixed(2);
    //var num=Math.floor(i2*100)/100;
    //var v3=v2/((parseFloat(a.value)*parseFloat(b.value)-num))*100000;
    var v3=v2/((parseFloat(a.value)*parseFloat(b.value)-i2.toFixed(2)))*100000;
    v3=v3.toFixed(2);
    var v4=v2/((parseFloat(a.value)*parseFloat(b.value)-i2.toFixed(3)))*100000;
    v4=v4.toFixed(2);
    g.value=v3;
    h.value=v1;
    gc.value=v4;
    }
    if(a.value==''||b.value=='')
    {
        h.value=''
	g.value=''
	gc.value=''
    }

}

function wendu(obj){
	var a=254.5/(234.5+parseFloat(obj));
	return a.toFixed(5);
}


function jisuan(obj)
{
    var wd=document.getElementById("wendu1")
    var sj=document.getElementById("shiji");
    if(wendu1.value!=''&&shiji.value!='')
    {
        var s=wendu(wd.value)
        z1=s*parseFloat(sj.value)
        var z2=z1.toFixed(2);
        zhi.value=z2;
    }
    if(wendu1.value==''||shiji.value=='')
    {
        zhi.value=''
    }
}

function Sbiao(obj)
{
    var a=document.getElementById("a");
    var b=document.getElementById("b");
    var c=document.getElementById("c");
    if(a.value!=''&&b.value!='')
    {
    if(a.value==0.8)
    var i=0.137344
    if(a.value==0.85)
    var i=0.1550485
    if(a.value==0.9)
    var i=0.173826
    if(a.value==0.95)
    var i=0.1936765
    if(a.value==1)
    var i=0.2146
    if(a.value>1 && a.value<=1.6)
    var i=0.2146
    if(a.value>1.6 && a.value<=2.24)
    var i=0.362674
    if(a.value>2.24 && a.value<=3.55)
    var i=0.549376
    if(a.value>3.55 && a.value<=5.6)
    var i=0.8584
    if(a.value>5.6 && a.value<=7.1)
    var i=1.236096
    if(a.value>7.1 && a.value<=8)
    var i=1.93140
    Sb.value=(parseFloat(a.value)*parseFloat(b.value)-i).toFixed(2);
    }
    if(a.value!=''&&b.value!=''&&c.value!='')
    {
    if(c.value==0.8)
    var i=0.137344
    if(c.value==0.85)
    var i=0.1550485
    if(c.value==0.9)
    var i=0.173826
    if(c.value==0.95)
    var i=0.1936765
    if(c.value==1)
    var i=0.2146
    if(c.value>1 && c.value<=1.6)
    var i=0.2146
    if(c.value>1.6 && c.value<=2.24)
    var i=0.362674
    if(c.value>2.24 && c.value<=3.55)
    var i=0.549376
    if(c.value>3.55 && c.value<=5.6)
    var i=0.8584
    if(c.value>5.6 && c.value<=7.1)
    var i=1.236096
    if(c.value>7.1 && c.value<=8)
    var i=1.93140
    Sb.value=(parseFloat(a.value)*parseFloat(b.value)-i).toFixed(2);
    }
    if(a.value==''||b.value=='')
    {
        Sb.value=''
    }
    
}

function Sshi(obj)
{
    var a=document.getElementById("weight");
    var b=document.getElementById("length");
    //var la=document.getElementById("la");
    if(a.value!=''&&b.value!='')
    {
        Ss.value=(parseFloat(a.value)/parseFloat(b.value)/8.89*1000).toFixed(2);
        Ssm.value=(parseFloat(a.value)/parseFloat(b.value)/8.9*1000).toFixed(2);
    }
    if(a.value==''||b.value=='')
    {
        Ss.value=''
        Ssm.value=''
    }
    
}
function klqd(obj)
{
var la=document.getElementById("la");
if(la.value!=''&&Ss.value!='')
    {
        kl1.value=(parseFloat(la.value)/parseFloat(Ss.value)).toFixed(3)*1000
    }
if(Ss.value=='')
	{
            kl1.value=''
	}

}
function Sj(obj)
{
    var a=document.getElementById("zhi");
    var b=document.getElementById("Ss");
    var c=document.getElementById("Ssm");
    if(a.value!=''&&b.value!='')
    {
        Sjz.value=z1*parseFloat(b.value);
	Sjz.value=Math.round(Sjz.value);
    }
    if(a.value!=''&&c.value!='')
    {
        Ssz.value=z1*parseFloat(c.value);
	Ssz.value=Math.round(Ssz.value);
    }
    if(a.value==''||b.value=='')
    {
        Sjz.value=''
    }
    if(a.value==''||c.value=='')
    {
        Ssz.value=''
    }
}

function Ji(obj)
{
    var a=document.getElementById("ji1");
    var b=document.getElementById("ji2");
        if(parseFloat(b.value)<parseFloat(a.value))
        {
		[a,b]=[b,a]
	}
        bo.value=(parseFloat(b.value)-parseFloat(a.value))/parseFloat(b.value)*100;
        bo1.value=2*(parseFloat(b.value)-parseFloat(a.value))/(parseFloat(a.value)+parseFloat(b.value))*100;


        if(bo.value<1.5)
        {
            hg.value='合格'
        }
        if(bo.value>=1.5)
        {
            hg.value='不合格'
        }
        if(bo.value==0)
        {
            hg.value=''
        }
}

function Kl(obj)
{
    var a=document.getElementById("kl1");
    var b=document.getElementById("Sb");
    if(a.value!=''&&b.value!=''){
	kl2.value=(parseFloat(a.value)*parseFloat(b.value)/1000).toFixed(2);
}
    if(a.value==''||b.value==''){
        kl2.value='';
    }

}

$(document).ready(function(){
    $("input").keyup(function(e){
	
	var str=$(this).val();
	if(str==false)
	{
	    $(this).val("");
	}

    })
})

function Cl(obj)
{
    var a=document.getElementById("ji1");
    var b=document.getElementById("ji2");
    if(a.value==''||b.value=='')
    {
        bo.value=''
	bo1.value=''
    }
}
