import{u as E,r as n,j as x}from"./index-B7jaigeE.js";function v(){const[t,e]=n.useState(!1);return n.useEffect(()=>{if(typeof globalThis.matchMedia!="function")return;const r=globalThis.matchMedia("(prefers-reduced-motion: reduce)");e(r.matches);const o=a=>e(a.matches);return r.addEventListener("change",o),()=>r.removeEventListener("change",o)},[]),t}function g(){const[t,e]=n.useState(!1);return n.useEffect(()=>{if(typeof navigator>"u")return;const r=navigator.hardwareConcurrency||4,o=navigator.deviceMemory||4;e(r<4||o<4)},[]),t}function w({children:t}){const[e]=E(),r=v(),o=g(),[a,s]=n.useState(t),[u,m]=n.useState(!1),[l,i]=n.useState("idle"),d=n.useRef(e),c=r||o,f=n.useCallback(()=>{if(c){s(t);return}if(d.current!==e){m(!0),i("exit");const y=setTimeout(()=>{s(t),i("enter");const h=setTimeout(()=>{i("idle"),m(!1)},200);return()=>clearTimeout(h)},150);return d.current=e,()=>clearTimeout(y)}else s(t)},[t,e,c]);n.useEffect(()=>{f()},[f]);const p=()=>{if(c||!u)return"";switch(l){case"exit":return"animate-route-exit";case"enter":return"animate-route-enter";default:return""}};return x.jsx("div",{className:`route-transition-container ${p()}`,style:{willChange:u?"opacity, transform":"auto",backfaceVisibility:"hidden",perspective:1e3},children:a})}if(typeof document<"u"){const t="route-transition-styles";if(!document.getElementById(t)){const e=document.createElement("style");e.id=t,e.textContent=`
      .route-transition-container {
        transform-style: preserve-3d;
      }
      
      @keyframes routeExit {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-12px);
        }
      }
      
      @keyframes routeEnter {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .animate-route-exit {
        animation: routeExit 150ms cubic-bezier(0.4, 0, 1, 1) forwards;
      }
      
      .animate-route-enter {
        animation: routeEnter 200ms cubic-bezier(0, 0, 0.2, 1) forwards;
      }
      
      @media (prefers-reduced-motion: reduce) {
        .animate-route-exit,
        .animate-route-enter {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
      }
    `,document.head.appendChild(e)}}export{w as LazyAnimatedRoutes};
