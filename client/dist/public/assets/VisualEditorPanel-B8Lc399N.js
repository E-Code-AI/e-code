import{cW as ne,r as i,dd as U,bu as re,bw as oe,ea as E,bv as ce,j as e,c as v,bQ as F,c6 as V,B as n,e3 as k,e4 as O,e5 as R,R as de,L as me,cs as pe,ce as he,ch as xe,bM as p,bN as P,cU as y,dg as ue,c7 as fe,fs as ge}from"./index-BrDVrE56.js";import{S as z}from"./slider-BCsIQHkv.js";import{S as ve}from"./switch-BYf3iAS6.js";import{S as M}from"./smartphone-D_B4XlEB.js";import{T as ye}from"./tablet-u1ugV1Us.js";import{M as D,A as we,e as je,f as Ne}from"./ReplitAgentPanelV3-Ccghqyo-.js";import{a as be,Z as Se}from"./zoom-out-DgYZDoje.js";import{U as Ce,R as Ee}from"./undo-2-Cw4dHOJF.js";import{T as ke}from"./type-CKiBPm6n.js";import{B as Oe}from"./bold-DlXqzEMO.js";import{I as Re}from"./italic-Kc1jSaxt.js";import{S as Pe}from"./save-Cs4_T7XC.js";import"./textarea-D937E47J.js";import"./brain-De0zu0Pb.js";import"./AIModelSelector-BbCKMeZp.js";import"./select-BhmE2mua.js";import"./chevron-up-CYWaXU1Z.js";import"./skeleton-F-9XRkbQ.js";import"./index-DnQnLp0x.js";import"./cpu-v2GHRyUt.js";import"./lightbulb-C87krxho.js";import"./LazyAgGrid-D0SQrNDb.js";import"./table-DhnLlVcH.js";import"./activity-m7ZPlHYc.js";import"./minimize-2-DeZ7AAdY.js";import"./maximize-2-DDmEcdir.js";import"./table-2-D5l_9D9I.js";import"./pause-Q826JGhd.js";import"./test-tube-Buf7vSz0.js";import"./rotate-ccw-Y3fXv1k6.js";import"./circle-x-Bj9TFdnY.js";import"./video-FMeMEGZ2.js";import"./circle-play-DnN3z0ws.js";import"./external-link-DJjXkGrv.js";import"./volume-x-qtGJx7El.js";import"./volume-2-6myMnfTC.js";import"./link-2-BhXK5RGv.js";import"./target-DovO2yHd.js";import"./filter-DumFrfrm.js";import"./command-6Ce-BLiI.js";import"./file-plus-Dj6HcI5E.js";import"./timer-B9I4-j1a.js";import"./minus-CqFswMYi.js";import"./square-pen-34J1BlDj.js";import"./LightSyntaxHighlighter-7xvUxOAA.js";import"./index-79B16JKS.js";import"./use-reduced-motion-BPWOFarF.js";import"./wand-sparkles-D_tZxnlD.js";import"./alert-dialog-B-ff6e4I.js";import"./mic-Cc_mvvRh.js";import"./send-DTNPnYi_.js";const H=[{name:"Mobile S",width:320,height:568,icon:M},{name:"Mobile M",width:375,height:667,icon:M},{name:"Mobile L",width:425,height:812,icon:M},{name:"Tablet",width:768,height:1024,icon:ye},{name:"Laptop",width:1024,height:768,icon:U},{name:"Desktop",width:1440,height:900,icon:U}],$=["#000000","#1f2937","#374151","#6b7280","#9ca3af","#d1d5db","#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e","#14b8a6","#06b6d4","#0ea5e9","#3b82f6","#6366f1","#8b5cf6","#a855f7","#d946ef","#ec4899","#f43f5e","#ffffff","transparent"];function Ot({projectId:g,onCodeChange:w,className:q}){ne();const x=i.useRef(null),_=i.useRef(!1),[c,Z]=i.useState(!1),[a,j]=i.useState(null),[N,Q]=i.useState(null),[r,b]=i.useState({}),[u,T]=i.useState(""),[m,X]=i.useState(H[5]),[f,A]=i.useState(100),[S,G]=i.useState(!0),[Y,J]=i.useState([]),[K,ee]=i.useState([]),{data:d,isLoading:te,refetch:C}=re({queryKey:["/api/preview/url",g],queryFn:async()=>{const t=await fetch(`/api/preview/url?projectId=${g}`,{credentials:"include"});if(!t.ok)throw new Error("Failed to get preview status");return t.json()},enabled:!!g,refetchInterval:t=>{const s=t.state.data;return s?.status==="starting"?2e3:s?.status==="running"?1e4:!1}}),L=oe({mutationFn:async()=>ce("POST",`/api/preview/projects/${g}/preview/start`,{}),onSuccess:()=>{E({title:"Preview starting..."}),setTimeout(()=>C(),2e3)},onError:t=>{E({title:"Failed to start preview",description:t.message,variant:"destructive"})}});i.useEffect(()=>{d?.status==="stopped"&&!_.current&&(_.current=!0,L.mutate(void 0))},[d?.status]);const I=i.useCallback(()=>{const t=x.current;if(t?.contentWindow)try{const s=`
        (function() {
          if (window.__visualEditorInjected) return;
          window.__visualEditorInjected = true;

          let highlightOverlay = document.createElement('div');
          highlightOverlay.id = '__visual-editor-overlay';
          highlightOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border:2px solid #8b5cf6;background:rgba(139,92,246,0.1);transition:all 0.15s ease;opacity:0;';
          document.body.appendChild(highlightOverlay);

          let selectedOverlay = document.createElement('div');
          selectedOverlay.id = '__visual-editor-selected';
          selectedOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99998;border:2px solid #22c55e;background:rgba(34,197,94,0.1);';
          document.body.appendChild(selectedOverlay);

          function getElementPath(el) {
            const path = [];
            while (el && el.tagName) {
              let selector = el.tagName.toLowerCase();
              if (el.id) selector += '#' + el.id;
              else if (el.className) selector += '.' + el.className.split(' ')[0];
              path.unshift(selector);
              el = el.parentElement;
            }
            return path.join(' > ');
          }

          function getElementInfo(el) {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            return {
              tagName: el.tagName,
              id: el.id || undefined,
              className: el.className || undefined,
              text: el.innerText?.substring(0, 200),
              src: el.src,
              href: el.href,
              path: getElementPath(el),
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              styles: {
                color: styles.color,
                backgroundColor: styles.backgroundColor,
                fontSize: styles.fontSize,
                fontWeight: styles.fontWeight,
                fontStyle: styles.fontStyle,
                textDecoration: styles.textDecoration,
                textAlign: styles.textAlign,
                padding: styles.padding,
                margin: styles.margin,
                borderRadius: styles.borderRadius,
                opacity: styles.opacity
              },
              canEdit: ['P','H1','H2','H3','H4','H5','H6','SPAN','A','BUTTON','DIV','SECTION','ARTICLE','HEADER','FOOTER','LABEL'].includes(el.tagName)
            };
          }

          function updateOverlay(overlay, rect, show) {
            if (show && rect) {
              overlay.style.left = rect.x + 'px';
              overlay.style.top = rect.y + 'px';
              overlay.style.width = rect.width + 'px';
              overlay.style.height = rect.height + 'px';
              overlay.style.opacity = '1';
            } else {
              overlay.style.opacity = '0';
            }
          }

          document.addEventListener('mousemove', function(e) {
            if (!window.__editModeActive) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el !== highlightOverlay && el !== selectedOverlay) {
              const info = getElementInfo(el);
              updateOverlay(highlightOverlay, info.rect, true);
              window.parent.postMessage({ type: 'element-hover', data: info }, '*');
            }
          });

          document.addEventListener('click', function(e) {
            if (!window.__editModeActive) return;
            e.preventDefault();
            e.stopPropagation();
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el !== highlightOverlay && el !== selectedOverlay) {
              window.__selectedElement = el;
              const info = getElementInfo(el);
              updateOverlay(selectedOverlay, info.rect, true);
              window.parent.postMessage({ type: 'element-select', data: info }, '*');
            }
          }, true);

          document.addEventListener('mouseleave', function() {
            updateOverlay(highlightOverlay, null, false);
            window.parent.postMessage({ type: 'element-hover', data: null }, '*');
          });

          window.addEventListener('message', function(e) {
            if (e.data.type === 'set-edit-mode') {
              window.__editModeActive = e.data.active;
              if (!e.data.active) {
                updateOverlay(highlightOverlay, null, false);
                updateOverlay(selectedOverlay, null, false);
              }
            } else if (e.data.type === 'apply-styles' && window.__selectedElement) {
              Object.assign(window.__selectedElement.style, e.data.styles);
              if (e.data.text !== undefined) {
                window.__selectedElement.innerText = e.data.text;
              }
              const info = getElementInfo(window.__selectedElement);
              updateOverlay(selectedOverlay, info.rect, true);
              window.parent.postMessage({ type: 'element-updated', data: info }, '*');
            } else if (e.data.type === 'show-outlines') {
              document.querySelectorAll('*').forEach(el => {
                if (e.data.show) {
                  el.style.outline = '1px dashed rgba(139,92,246,0.3)';
                } else {
                  el.style.outline = '';
                }
              });
            }
          });

          console.log('[VisualEditor] Script injected successfully');
        })();
      `;t.contentWindow.postMessage({type:"inject-script",script:s},"*");const h=t.contentDocument;if(h){const B=h.createElement("script");B.textContent=s,h.body.appendChild(B)}}catch{}},[]);i.useEffect(()=>{const t=s=>{s.data.type==="element-hover"?Q(s.data.data):s.data.type==="element-select"?(j(s.data.data),T(s.data.data?.text||""),b({})):s.data.type==="element-updated"&&j(s.data.data)};return window.addEventListener("message",t),()=>window.removeEventListener("message",t)},[]),i.useEffect(()=>{const t=x.current;t&&t.contentWindow?.postMessage({type:"set-edit-mode",active:c},"*")},[c]),i.useEffect(()=>{const t=x.current;t&&t.contentWindow?.postMessage({type:"show-outlines",show:S&&c},"*")},[S,c]);const se=i.useCallback(()=>{setTimeout(I,500)},[I]),o=i.useCallback((t,s)=>{b(h=>({...h,[t]:s}))},[]),ae=i.useCallback(()=>{if(!a)return;const t={...r},s=u!==a.text;J(h=>[...h,{element:a,styles:r,text:s?u:void 0}]),ee([]),x.current?.contentWindow?.postMessage({type:"apply-styles",styles:t,text:s?u:void 0},"*"),E({title:"Changes applied",description:"Style changes applied to preview"}),w&&w(a.path,JSON.stringify({styles:t,text:s?u:void 0}))},[a,r,u,w]),le=i.useCallback(()=>{const t=x.current;if(t&&d?.previewUrl){const s=new URL(d.previewUrl,window.location.origin);s.searchParams.set("_t",Date.now().toString()),t.src=s.toString()}C()},[d?.previewUrl,C]),W=d?.status==="running"||d?.status==="static",ie=W&&d?.previewUrl,l={color:r.color||a?.styles.color||"#000000",backgroundColor:r.backgroundColor||a?.styles.backgroundColor||"transparent",textAlign:r.textAlign||a?.styles.textAlign||"left",fontWeight:r.fontWeight||a?.styles.fontWeight||"normal",fontStyle:r.fontStyle||a?.styles.fontStyle||"normal",fontSize:r.fontSize||a?.styles.fontSize||"16px",borderRadius:r.borderRadius||a?.styles.borderRadius||"0px",opacity:r.opacity||a?.styles.opacity||"1"};return e.jsxs("div",{className:v("h-full flex flex-col bg-[var(--ecode-surface)]",q),children:[e.jsxs("div",{className:"h-9 border-b border-[var(--ecode-border)] flex items-center justify-between px-2.5 gap-2 bg-[var(--ecode-surface)]",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(F,{className:"h-3.5 w-3.5 shrink-0 text-[var(--ecode-text-muted)]"}),e.jsx("span",{className:"text-xs font-medium text-[var(--ecode-text-muted)]",children:"Visual Editor"}),W&&e.jsx(V,{variant:"secondary",className:"text-[11px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",children:"Live"})]}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsxs(n,{variant:c?"default":"outline",size:"sm",onClick:()=>Z(!c),className:v("h-7 gap-1",c&&"bg-purple-600 hover:bg-purple-700"),"data-testid":"toggle-edit-mode",children:[e.jsx(D,{className:"h-3.5 w-3.5"}),e.jsx("span",{className:"text-[11px] hidden sm:inline",children:c?"Editing":"Edit"})]}),e.jsxs(k,{children:[e.jsx(O,{asChild:!0,children:e.jsxs(n,{variant:"outline",size:"sm",className:"h-7 gap-1 px-2",children:[m.icon&&e.jsx(m.icon,{className:"h-3.5 w-3.5"}),e.jsx("span",{className:"text-[11px] hidden md:inline",children:m.name})]})}),e.jsx(R,{className:"w-48 p-2",align:"end",children:e.jsx("div",{className:"space-y-1",children:H.map(t=>e.jsxs(n,{variant:m.name===t.name?"secondary":"ghost",size:"sm",className:"w-full justify-start gap-2 h-8",onClick:()=>X(t),children:[e.jsx(t.icon,{className:"h-3.5 w-3.5"}),e.jsx("span",{className:"text-[11px]",children:t.name}),e.jsxs("span",{className:"text-[11px] text-muted-foreground ml-auto",children:[t.width,"×",t.height]})]},t.name))})})]}),e.jsxs("div",{className:"flex items-center gap-1 border rounded px-1",children:[e.jsx(n,{variant:"ghost",size:"sm",className:"h-6 w-6 p-0",onClick:()=>A(Math.max(25,f-25)),children:e.jsx(be,{className:"h-3 w-3"})}),e.jsxs("span",{className:"text-[11px] w-10 text-center",children:[f,"%"]}),e.jsx(n,{variant:"ghost",size:"sm",className:"h-6 w-6 p-0",onClick:()=>A(Math.min(200,f+25)),children:e.jsx(Se,{className:"h-3 w-3"})})]}),e.jsx(n,{variant:"ghost",size:"sm",onClick:le,className:"h-7 w-7 p-0",children:e.jsx(de,{className:"h-3.5 w-3.5"})})]})]}),e.jsxs("div",{className:"flex-1 flex overflow-hidden",children:[e.jsx("div",{className:"flex-1 flex items-center justify-center bg-muted/30 p-4 overflow-auto",children:te?e.jsx("div",{className:"flex items-center justify-center",children:e.jsx(me,{className:"h-8 w-8 animate-spin text-muted-foreground"})}):ie?e.jsx("div",{className:"bg-white rounded-lg shadow-lg overflow-hidden transition-all",style:{width:m.width*(f/100),height:m.height*(f/100)},children:e.jsx("iframe",{ref:x,src:d.previewUrl||"",className:"w-full h-full border-0",style:{transform:`scale(${f/100})`,transformOrigin:"top left",width:m.width,height:m.height},title:"Visual Editor Preview",sandbox:"allow-scripts allow-same-origin allow-forms allow-modals allow-popups",onLoad:se,"data-testid":"visual-editor-iframe"})}):e.jsxs("div",{className:"text-center p-8",children:[e.jsx(F,{className:"h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50"}),e.jsx("h3",{className:"text-[15px] font-semibold mb-2",children:"Preview not available"}),e.jsx("p",{className:"text-[13px] text-muted-foreground mb-4",children:"Start the preview to use the visual editor"}),e.jsxs(n,{onClick:()=>L.mutate(void 0),children:[e.jsx(pe,{className:"h-4 w-4 mr-2"}),"Start Preview"]})]})}),c&&e.jsxs("div",{className:"w-72 border-l bg-card flex flex-col",children:[e.jsxs("div",{className:"p-3 border-b",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("h3",{className:"text-[13px] font-semibold",children:"Element Inspector"}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx(n,{variant:"ghost",size:"sm",className:"h-6 w-6 p-0",disabled:Y.length===0,children:e.jsx(Ce,{className:"h-3.5 w-3.5"})}),e.jsx(n,{variant:"ghost",size:"sm",className:"h-6 w-6 p-0",disabled:K.length===0,children:e.jsx(Ee,{className:"h-3.5 w-3.5"})})]})]}),e.jsxs("div",{className:"flex items-center gap-2 text-[11px] text-muted-foreground",children:[e.jsx(ve,{checked:S,onCheckedChange:G,className:"scale-75"}),e.jsx("span",{children:"Show element outlines"})]})]}),e.jsx(he,{className:"flex-1",children:a?e.jsxs("div",{className:"p-3 space-y-4",children:[e.jsxs("div",{className:"p-2 bg-surface-tertiary-solid rounded-lg",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx(xe,{className:"h-3.5 w-3.5 text-purple-500"}),e.jsx("span",{className:"text-[11px] font-medium",children:a.tagName}),a.id&&e.jsxs(V,{variant:"outline",className:"text-[10px] h-4",children:["#",a.id]})]}),e.jsx("p",{className:"text-[10px] text-muted-foreground truncate",children:a.path})]}),a.canEdit&&a.text&&e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs(p,{className:"text-[11px] flex items-center gap-1.5",children:[e.jsx(ke,{className:"w-3 h-3"})," Text Content"]}),e.jsx(P,{value:u,onChange:t=>T(t.target.value),className:"h-8 text-[11px]","data-testid":"text-content-input"})]}),e.jsx(y,{}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs(p,{className:"text-[11px] flex items-center gap-1.5",children:[e.jsx(ue,{className:"w-3 h-3"})," Colors"]}),e.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(p,{className:"text-[10px] text-muted-foreground",children:"Text"}),e.jsxs(k,{children:[e.jsx(O,{asChild:!0,children:e.jsxs(n,{variant:"outline",size:"sm",className:"w-full h-8 justify-start gap-2",children:[e.jsx("div",{className:"w-4 h-4 rounded border",style:{backgroundColor:l.color}}),e.jsx("span",{className:"text-[11px] truncate",children:l.color})]})}),e.jsxs(R,{className:"w-48 p-2",children:[e.jsx("div",{className:"grid grid-cols-6 gap-1 mb-2",children:$.map(t=>e.jsx("button",{className:v("w-5 h-5 rounded border",l.color===t&&"ring-2 ring-primary"),style:{backgroundColor:t},onClick:()=>o("color",t)},t))}),e.jsx(P,{type:"color",value:l.color,onChange:t=>o("color",t.target.value),className:"w-full h-8"})]})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(p,{className:"text-[10px] text-muted-foreground",children:"Background"}),e.jsxs(k,{children:[e.jsx(O,{asChild:!0,children:e.jsxs(n,{variant:"outline",size:"sm",className:"w-full h-8 justify-start gap-2",children:[e.jsx("div",{className:"w-4 h-4 rounded border",style:{backgroundColor:l.backgroundColor}}),e.jsx("span",{className:"text-[11px] truncate",children:"BG"})]})}),e.jsxs(R,{className:"w-48 p-2",children:[e.jsx("div",{className:"grid grid-cols-6 gap-1 mb-2",children:$.map(t=>e.jsx("button",{className:v("w-5 h-5 rounded border",l.backgroundColor===t&&"ring-2 ring-primary"),style:{backgroundColor:t},onClick:()=>o("backgroundColor",t)},t))}),e.jsx(P,{type:"color",value:l.backgroundColor==="transparent"?"#ffffff":l.backgroundColor,onChange:t=>o("backgroundColor",t.target.value),className:"w-full h-8"})]})]})]})]})]}),e.jsx(y,{}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(p,{className:"text-[11px]",children:"Typography"}),e.jsx("div",{className:"flex gap-1",children:[{value:"left",icon:we},{value:"center",icon:je},{value:"right",icon:Ne}].map(({value:t,icon:s})=>e.jsx(n,{variant:l.textAlign===t?"default":"outline",size:"sm",className:"h-7 flex-1",onClick:()=>o("textAlign",t),children:e.jsx(s,{className:"w-3.5 h-3.5"})},t))}),e.jsxs("div",{className:"flex gap-1",children:[e.jsx(n,{variant:l.fontWeight==="bold"||l.fontWeight==="700"?"default":"outline",size:"sm",className:"h-7 flex-1",onClick:()=>o("fontWeight",l.fontWeight==="bold"||l.fontWeight==="700"?"normal":"bold"),children:e.jsx(Oe,{className:"w-3.5 h-3.5"})}),e.jsx(n,{variant:l.fontStyle==="italic"?"default":"outline",size:"sm",className:"h-7 flex-1",onClick:()=>o("fontStyle",l.fontStyle==="italic"?"normal":"italic"),children:e.jsx(Re,{className:"w-3.5 h-3.5"})})]})]}),e.jsx(y,{}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(p,{className:"text-[11px]",children:"Font Size"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(z,{value:[parseInt(l.fontSize)||16],onValueChange:([t])=>o("fontSize",`${t}px`),min:8,max:72,step:1,className:"flex-1"}),e.jsx("span",{className:"text-[11px] w-10 text-right",children:l.fontSize})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(p,{className:"text-[11px]",children:"Border Radius"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(z,{value:[parseInt(l.borderRadius)||0],onValueChange:([t])=>o("borderRadius",`${t}px`),min:0,max:50,step:1,className:"flex-1"}),e.jsx("span",{className:"text-[11px] w-10 text-right",children:l.borderRadius})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(p,{className:"text-[11px]",children:"Opacity"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(z,{value:[parseFloat(l.opacity)*100||100],onValueChange:([t])=>o("opacity",String(t/100)),min:0,max:100,step:5,className:"flex-1"}),e.jsxs("span",{className:"text-[11px] w-10 text-right",children:[Math.round(parseFloat(l.opacity)*100),"%"]})]})]}),e.jsx(y,{}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(n,{variant:"outline",size:"sm",className:"flex-1",onClick:()=>{j(null),b({})},children:[e.jsx(fe,{className:"h-3.5 w-3.5 mr-1"}),"Cancel"]}),e.jsxs(n,{size:"sm",className:"flex-1",onClick:ae,children:[e.jsx(Pe,{className:"h-3.5 w-3.5 mr-1"}),"Apply"]})]})]}):e.jsxs("div",{className:"p-8 text-center text-muted-foreground",children:[e.jsx(D,{className:"h-12 w-12 mx-auto mb-4 opacity-50"}),e.jsx("p",{className:"text-[13px] font-medium mb-1",children:"Click an element to edit"}),e.jsx("p",{className:"text-[11px]",children:"Select any element in the preview to modify its styles"})]})}),N&&!a&&e.jsx("div",{className:"p-2 border-t bg-muted/30",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ge,{className:"h-3.5 w-3.5 text-muted-foreground"}),e.jsxs("span",{className:"text-[11px] text-muted-foreground truncate",children:[N.tagName," - ",N.path]})]})})]})]})]})}export{Ot as VisualEditorPanel};
