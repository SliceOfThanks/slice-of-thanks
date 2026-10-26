from PIL import Image
H=830
C={'box':('u0-closed',0),'kitchen':('k2b',0),'note':('u1-open',0),'half':('u3-half',0),'gift':('u4-gift',0),
'send':('send2',930),'home':('home2',440),'meet':('settings2',1530),'dates':('settings2',2150),'hire':('hire',200),
'boxstep':('k4b',260),'review':('u5-full',1760),'people':('peopleb',230)}
for k,(f,y) in C.items():
    im=Image.open('shots/'+f+'.png'); s=3
    y2=min(im.size[1], (y+H)*s); y1=y2-H*s if y2-H*s>=0 else 0
    if y*s+H*s<=im.size[1]: y1=y*s; y2=y*s+H*s
    im.crop((0,y1,1206,y2)).save('crops/'+k+'.png')
ims=[Image.open('crops/'+k+'.png').resize((201,415)) for k in C]
sheet=Image.new('RGB',(7*211,2*425),'white')
for i,im in enumerate(ims): sheet.paste(im,((i%7)*211,(i//7)*425))
sheet.save('th/crops.png')
