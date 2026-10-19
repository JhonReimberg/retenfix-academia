import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const colors={haste:0x2787d4,pistao:0x5477df,raspador:0x32ad91,guia:0xc2a778,oring:0x34434b,apoio:0xd9d3bd,retentor:0x426aa3,chevron:0x3185c6};
export class Lab {
  constructor(container,{scene='cilindro',selected='haste',onSelect=()=>{},compact=false}={}){
    this.container=container;this.type=scene;this.selected=selected;this.onSelect=onSelect;this.compact=compact;this.exploded=false;this.playing=false;this.cut=true;this.meshes=[];this.time=0;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xeaf0f5);
    this.camera=new THREE.PerspectiveCamera(34,1,0.1,100);this.camera.position.set(7,5,9);
    try{this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:false});}catch(e){container.innerHTML='<div class="empty"><h3>Visualização 3D indisponível</h3><p>A placa de vídeo não disponibilizou o recurso. As descrições de aplicação e os catálogos continuam disponíveis.</p></div>';this.failed=true;return;}
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label','Modelo 3D didático. Arraste para girar e use os controles para explorar.');container.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.minDistance=5;this.controls.maxDistance=21;this.controls.maxPolarAngle=Math.PI*0.88;this.controls.target.set(0,0.1,0);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x778da8,3));
    const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(4,9,7);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-8;light.shadow.camera.right=8;light.shadow.camera.top=7;light.shadow.camera.bottom=-7;light.shadow.normalBias=0.03;this.scene.add(light);
    const fill=new THREE.DirectionalLight(0xa7cfff,2.5);fill.position.set(-7,2,-4);this.scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xeaf0f5,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.4;floor.receiveShadow=true;this.scene.add(floor);
    const grid=new THREE.GridHelper(28,56,0xc9d5e0,0xd7e0e8);grid.position.y=-1.395;grid.material.transparent=true;grid.material.opacity=0.42;this.scene.add(grid);
    this.group=new THREE.Group();this.scene.add(this.group);
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    let start;
    this.pointerDown=e=>{start=[e.clientX,e.clientY];};
    this.pointerUp=e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;const box=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.meshes.filter(m=>m.userData.part),false)[0];if(hit){this.select(hit.object.userData.part);this.onSelect(hit.object.userData.part);}};
    this.renderer.domElement.addEventListener('pointerdown',this.pointerDown);this.renderer.domElement.addEventListener('pointerup',this.pointerUp);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.build();this.resize();this.animate();
  }
  material(color,metal=false){return new THREE.MeshStandardMaterial({color,metalness:metal?0.75:0.08,roughness:metal?0.28:0.42,side:THREE.DoubleSide});}
  add(geometry,position,color,{part=null,metal=false,moving=false}={}){
    const mesh=new THREE.Mesh(geometry,this.material(color,metal));mesh.rotation.z=-Math.PI/2;mesh.position.set(position,0,0);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={part,base:position,moving,color};this.group.add(mesh);this.meshes.push(mesh);return mesh;
  }
  tube(outer,inner,length,cut=false){
    const points=[[inner,-length/2],[outer,-length/2],[outer,length/2],[inner,length/2],[inner,-length/2]].map(p=>new THREE.Vector2(...p));
    return new THREE.LatheGeometry(points,96,cut?0.6:0,cut?Math.PI*1.45:Math.PI*2);
  }
  cup(outer,inner,width){
    const p=[[inner,-width/2],[outer,-width/2],[outer,width/2],[outer-0.09,width/2-0.04],[outer-0.16,-width/2+0.12],[inner+0.16,-width/2+0.12],[inner+0.08,width/2-0.04],[inner,width/2],[inner,-width/2]];
    return new THREE.LatheGeometry(p.map(v=>new THREE.Vector2(...v)),96);
  }
  ring(rad,tube){const geo=new THREE.TorusGeometry(rad,tube,16,100);geo.rotateX(Math.PI/2);return geo;}
  clear(){for(const m of this.meshes){m.geometry.dispose();m.material.dispose();this.group.remove(m);}this.meshes=[];}
  build(){
    if(this.failed)return;this.clear();
    if(this.type==='cilindro'){
      this.add(this.tube(1.07,0.89,3.5,this.cut),-0.9,0x819bb1,{metal:true});
      this.add(new THREE.CylinderGeometry(1.12,1.12,0.28,80),-2.77,0x537487,{metal:true});
      this.add(new THREE.CylinderGeometry(0.42,0.42,4.65,80),0.65,0xd4e0e7,{metal:true,moving:true});
      this.add(new THREE.CylinderGeometry(0.83,0.83,0.62,80),-1.65,0xbac8d3,{metal:true,moving:true});
      this.add(this.cup(0.915,0.73,0.27),-1.65,colors.pistao,{part:'pistao',moving:true});
      this.add(this.tube(0.89,0.80,0.14),-1.98,colors.guia,{part:'guia',moving:true});
      this.add(this.tube(1.13,0.48,0.68,this.cut),1.07,0xa1b3c2,{metal:true});
      this.add(this.cup(0.72,0.425,0.23),0.79,colors.haste,{part:'haste'});
      this.add(this.tube(0.64,0.44,0.18),1.08,colors.guia,{part:'guia'});
      this.add(this.cup(0.74,0.425,0.19),1.46,colors.raspador,{part:'raspador'});
      this.add(this.ring(1.00,0.045),0.86,colors.oring,{part:'oring'});
      for(const x of [-2.66,0.93])for(const a of [0.9,2.5,4,5.6]){const bolt=this.add(new THREE.CylinderGeometry(0.09,0.09,0.32,6),x,0x647d91,{metal:true});bolt.position.y=Math.sin(a)*0.9;bolt.position.z=Math.cos(a)*0.9;}
    }else if(this.type==='flange'){
      this.add(this.tube(1.5,0.7,0.45,this.cut),-0.5,0x93aabc,{metal:true});
      this.add(this.tube(1.5,0.7,0.45,this.cut),0.6,0xb3c4cf,{metal:true});
      this.add(this.ring(1.08,0.12),0,colors.oring,{part:'oring'});
      this.add(this.tube(1.23,0.94,0.08),0.24,colors.apoio,{part:'apoio'});
      for(const a of [0.6,2.2,3.8,5.4]){const bolt=this.add(new THREE.CylinderGeometry(0.1,0.1,1.8,6),0,0x657f93,{metal:true});bolt.position.y=Math.sin(a)*1.32;bolt.position.z=Math.cos(a)*1.32;}
    }else if(this.type==='rotativo'){
      this.add(this.tube(1.4,0.88,1.3,this.cut),0,0x8aa5b8,{metal:true});
      this.add(new THREE.CylinderGeometry(0.54,0.54,5,80),0,0xc9d8e3,{metal:true,moving:true});
      this.add(this.cup(0.94,0.54,0.4),0.84,colors.retentor,{part:'retentor'});
      this.add(this.ring(0.66,0.035),1.04,0xb9c8d4,{part:'retentor',metal:true});
      this.add(this.tube(0.99,0.90,0.4),0.83,0x456077,{part:'retentor',metal:true});
      const marker=this.add(new THREE.BoxGeometry(0.07,2.2,0.05),0.4,0x5d819c,{moving:true});marker.position.z=0.54;
    }else{
      this.add(new THREE.CylinderGeometry(0.51,0.51,5,80),0,0xc7d8e5,{metal:true,moving:true});
      this.add(this.tube(1.12,0.55,2.2,this.cut),-0.2,0x91aabf,{metal:true});
      for(let i=0;i<4;i++)this.add(this.cup(0.96,0.52,0.24),-0.7+i*0.35,colors.chevron,{part:'chevron'});
      this.add(this.tube(0.97,0.53,0.16),-1,colors.apoio,{part:'apoio'});this.add(this.tube(0.97,0.53,0.16),0.62,colors.apoio,{part:'apoio'});
    }
    this.select(this.selected);
  }
  select(id){this.selected=id;if(this.failed)return;for(const m of this.meshes){if(m.userData.part){const active=m.userData.part===id;m.material.emissive.set(active?0x156ec0:0x000000);m.material.emissiveIntensity=active?0.3:0;m.material.color.set(active?0x2498ed:m.userData.color);}}}
  change(type,selected){this.type=type;this.selected=selected;this.time=0;this.build();this.reset();}
  toggleExploded(){this.exploded=!this.exploded;return this.exploded;}
  toggleCut(){this.cut=!this.cut;this.build();return this.cut;}
  togglePlay(){this.playing=!this.playing;return this.playing;}
  reset(){if(this.failed)return;this.camera.position.set(7,5,9);this.controls.target.set(0,0.1,0);this.controls.update();}
  zoom(direction){if(this.failed)return;const offset=this.camera.position.clone().sub(this.controls.target);offset.multiplyScalar(direction>0?0.84:1.18);if(offset.length()>=5&&offset.length()<=21)this.camera.position.copy(this.controls.target).add(offset);this.controls.update();}
  resize(){if(this.failed)return;const width=this.container.clientWidth,height=this.container.clientHeight;if(!width||!height)return;this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
  animate(){if(this.failed)return;this.frame=requestAnimationFrame(()=>this.animate());if(this.playing)this.time+=0.016;for(const m of this.meshes){const extra=this.exploded?(m.userData.base*0.63+(m.userData.part?0.12:0)):0;const motion=this.type==='cilindro'&&m.userData.moving?Math.sin(this.time)*0.44:0;m.position.x=THREE.MathUtils.lerp(m.position.x,m.userData.base+extra+motion,0.12);if(this.type==='rotativo'&&m.userData.moving)m.rotation.y=this.time;}this.controls.update();this.renderer.render(this.scene,this.camera);}
  dispose(){if(this.failed)return;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.renderer.domElement.removeEventListener('pointerdown',this.pointerDown);this.renderer.domElement.removeEventListener('pointerup',this.pointerUp);this.controls.dispose();this.clear();this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
