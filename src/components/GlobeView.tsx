import React, { useEffect, useRef, useState } from 'react';
import * as three from 'three';
import { Globe, Countries, Controls, Helpers } from '../3d-nils-globe';
import { LocationData } from '../interfaces';
import { getIconFilenameForType } from '../iconMap';

type Props = { locations: LocationData[] };

function getImageFilename(location: string): string[] {
  const primary = location.replace(/['’]/g, '') + '.png';
  const fallback = location.replace(/['’]/g, '').replace(/\s+/g, '-') + '.png';
  return [primary, fallback];
}

const formatYear = (year: number): string => {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
};

type MarkerRect = { id: number; x: number; y: number; w: number; h: number };

const GlobeView: React.FC<Props> = ({ locations }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const popupLayerRef = useRef<HTMLDivElement | null>(null);

  const appRef = useRef<{
    scene: three.Scene;
    camera: three.PerspectiveCamera;
    cameraSphere: three.Spherical;
    globe: Globe;
    countries: Countries;
    controls: Controls;
    requestRender: () => void;
    animId: number | null;
    markerRects: MarkerRect[];
  } | null>(null);

  const [activeMarkerId, setActiveMarkerId] = useState<number | null>(null);
  const activeMarkerIdRef = useRef<number | null>(null);
  const locationsRef = useRef<LocationData[]>(locations);

  // init with vendor code
  useEffect(() => {
    const container = containerRef.current;
    const labelCanvas = labelCanvasRef.current;
    if (!container || !labelCanvas) return;

    const scene = new three.Scene();
    const africaLon = -90; // longitude
    const africaLat = 30; // 30°N
    const africaTheta = (africaLon + 180) * Math.PI / 180;
    const africaPhi = (90 - africaLat) * Math.PI / 180;
    const cameraSphere = new three.Spherical(3, africaPhi, africaTheta);
    const camera = new three.PerspectiveCamera(55, container.clientWidth / container.clientHeight);
    let renderRequested = false;
    const requestRender = () => { renderRequested = true; };

    const globe = new Globe(scene, camera, cameraSphere, requestRender);
    const countries = new Countries(scene, camera, requestRender);
    globe.createGlobe(container);
    countries.fetchGeoJson();

    // Controls wired like the repo
    const controls = new Controls(container, {
      onDrag: ({ dx, dy }: { dx: number; dy: number }) => {
        const dragSpeed = cameraSphere.radius * 0.0015;
        globe.rotate(dx, dy, dragSpeed);
      },
      onClick: ({ clientX, clientY }: { clientX: number; clientY: number }) => {
        handleClick(clientX, clientY);
      },
      onWheel: ({ deltaY, event }: { deltaY: number; event: WheelEvent }) => {
        event.preventDefault();
        const zoomSpeed = cameraSphere.radius * 0.001;
        const newR = cameraSphere.radius + deltaY * zoomSpeed;
        cameraSphere.radius = Math.max(1.5, Math.min(10, newR));
        camera.position.setFromSpherical(cameraSphere);
        requestRender();
      },
      onResize: () => {
        handleResize();
      },
      onHover: undefined,
      inertia: true,
      inertiaDecay: 0.96,
    });

    // draw loop: render globe then our labels on canvas
    const ctx = labelCanvas.getContext('2d');
    const draw = () => {
      if (!appRef.current || !ctx) return;
      // render
      globe.renderer.render(scene, camera);
      // labels
      drawMarkers(ctx);
      renderRequested = false;
    };

    const animate = () => {
      appRef.current!.animId = requestAnimationFrame(animate);
      if (renderRequested) draw();
    };

    const resizeCanvas = () => {
      labelCanvas.width = container.clientWidth;
      labelCanvas.height = container.clientHeight;
    };

    const handleResize = () => {
      globe.resizeCanvas(container);
      resizeCanvas();
    };

    const handleClick = (x: number, y: number) => {
      const rect = container.getBoundingClientRect();
      const mx = x - rect.left;
      const my = y - rect.top;
      const hit = appRef.current?.markerRects.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
      if (hit) {
        const next = activeMarkerIdRef.current === hit.id ? null : hit.id;
        activeMarkerIdRef.current = next;
        setActiveMarkerId(next);
        requestRender();
        return;
      }
      // otherwise country highlight
      // Close any open popup
      if (activeMarkerIdRef.current !== null) {
        activeMarkerIdRef.current = null;
        setActiveMarkerId(null);
      }
      const country = countries.getCountryAtMousePos({ x, y }, rect, globe.earthMesh);
      if (country) {
        countries.drawCountry(country);
        requestRender();
      }
    };

    const drawMarkers = (ctx2d: CanvasRenderingContext2D) => {
      ctx2d.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
      const markerRects: MarkerRect[] = [];
      const camPos = camera.position.clone();

      // Draw each marker: occlude back-side
      for (const loc of locationsRef.current) {
        if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;
        const pos = Helpers.latLonToVector3(loc.latitude, loc.longitude, 1);
        const cameraToPlane = pos.clone().sub(camPos);
        const angle = pos.angleTo(cameraToPlane);
        if (angle < Math.PI / 2) continue; // occlude far side like repo

        // project to NDC via three API (types relaxed in shim)
        const ndc = (pos.clone() as unknown as { project: (cam: three.PerspectiveCamera) => { x: number; y: number } }).project(camera);
        const px = (ndc.x + 1) / 2 * labelCanvas.width;
        const py = (1 - ndc.y) / 2 * labelCanvas.height;

        const fontSize = 11;
        ctx2d.font = `${fontSize}px monospace`;
        ctx2d.textAlign = 'left';

        const name = loc.location;
        const m = ctx2d.measureText(name);
        const textW = m.width;
        const iconSize = 14;
        const padX = 6; const padY = 4; const gap = 6;
        const boxW = iconSize + gap + textW + padX * 2;
        const boxH = Math.max(iconSize, fontSize) + padY * 2;
        const bx = px - boxW / 2;
        const by = py - boxH / 2;

        // background
        ctx2d.fillStyle = 'rgba(0,0,0,0.75)';
        ctx2d.fillRect(bx, by, boxW, boxH);
        ctx2d.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx2d.lineWidth = 1;
        ctx2d.strokeRect(bx, by, boxW, boxH);

        // icon
        const iconFilename = getIconFilenameForType(loc.type_site || 'settlement');
        const img = new Image();
        img.src = `/icons/${iconFilename}`;
        // draw immediately (may pop in after load)
        img.onload = () => {
          if (!appRef.current) return;
          ctx2d.drawImage(img, bx + padX, by + (boxH - iconSize) / 2, iconSize, iconSize);
        };

        // text
        ctx2d.fillStyle = '#fff';
        const tx = bx + padX + iconSize + gap;
        const ty = by + boxH / 2 + fontSize * 0.36;
        ctx2d.fillText(name, tx, ty);

        markerRects.push({ id: loc.id, x: bx, y: by, w: boxW, h: boxH });
      }

      // store rects for click hit-testing
      if (appRef.current) appRef.current.markerRects = markerRects;

      // manage popup layer for active marker
      renderPopup(markerRects);
    };

    const renderPopup = (rects: MarkerRect[]) => {
      const layer = popupLayerRef.current;
      if (!layer) return;
      layer.innerHTML = '';
      const activeId = activeMarkerIdRef.current;
      if (activeId == null) return;
      const match = rects.find(r => r.id === activeId);
      const loc = locationsRef.current.find(l => l.id === activeId);
      if (!match || !loc) return;

      const card = document.createElement('div');
      Object.assign(card.style, {
        position: 'absolute',
        left: `${match.x + match.w / 2}px`,
        top: `${match.y + match.h + 8}px`,
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.85)',
        color: 'var(--color-text-primary, #fff)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0',
        padding: '8px',
        minWidth: '140px',
        maxWidth: '180px',
        textAlign: 'left',
        pointerEvents: 'auto',
      } as CSSStyleDeclaration);

      const imageCandidates = getImageFilename(loc.location);
      const img = document.createElement('img');
      img.src = `/Settlements-pixelated/${imageCandidates[0]}`;
      img.alt = loc.location;
      Object.assign(img.style, { maxWidth: '140px', maxHeight: '90px', borderRadius: '0', display: 'block', marginBottom: '6px' } as CSSStyleDeclaration);
      img.onerror = () => { img.src = `/Settlements-pixelated/${imageCandidates[1]}`; };
      card.appendChild(img);

      const details = document.createElement('div');
      details.style.marginTop = '6px';
      details.style.fontSize = '11px';
      details.style.lineHeight = '1.3';
      details.innerHTML = `
        <div>${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}</div>
        ${loc.type_site ? `<div>${(loc.type_site || '').replace('.svg','')}</div>` : ''}
        ${loc.culture ? `<div>${loc.culture}</div>` : ''}
        ${loc.country ? `<div>${loc.country}</div>` : ''}
        ${loc.continent ? `<div>${loc.continent}</div>` : ''}
        ${loc.established_year ? `<div>${formatYear(loc.established_year)}</div>` : ''}
        ${loc.hist_period ? `<div>${loc.hist_period}</div>` : ''}
        ${loc.unesco_whs ? `<div>${loc.unesco_whs}</div>` : ''}
      `;
      card.appendChild(details);

      card.addEventListener('click', (e) => e.stopPropagation());
      layer.appendChild(card);
    };

    // set up appRef and start loop
    appRef.current = {
      scene,
      camera,
      cameraSphere,
      globe,
      countries,
      controls,
      requestRender,
      animId: null,
      markerRects: [],
    };

    // initial sizing
    labelCanvas.width = container.clientWidth;
    labelCanvas.height = container.clientHeight;

    requestRender();
    animate();

    // cleanup
    return () => {
      if (appRef.current?.animId) cancelAnimationFrame(appRef.current.animId);
      controls.dispose();
      appRef.current = null;
    };
  }, []);

  // request a redraw when locations or active marker changes
  useEffect(() => {
    locationsRef.current = locations;
    if (!appRef.current) return;
    appRef.current.requestRender();
  }, [locations]);

  useEffect(() => {
    activeMarkerIdRef.current = activeMarkerId;
    if (!appRef.current) return;
    appRef.current.requestRender();
  }, [activeMarkerId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <canvas ref={labelCanvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div ref={popupLayerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </div>
  );
};

export default GlobeView;
