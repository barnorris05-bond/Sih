"use client";

import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { ArrowDownRight, ArrowRight } from "lucide-react";
import { journeyStore, useJourney } from "@/lib/journey-store";
import { cn } from "@/lib/utils";
import {
  NODE_COUNT,
  along,
  buildRoute,
  clamp,
  computeScene,
  heroOrbit,
  lerp,
  lerpPt,
  nodeBlend,
  plateau,
  rowLayout,
  routeD,
  segTo,
  smoothstep,
  stackedJourneyOrbit,
  totalLen,
  type Frame,
  type Orbit,
} from "./geometry";
import { STAGES, TONE_HEX } from "./stages";
import { SATS, UniverseSvg } from "./universe-svg";
import "./journey.css";

const DEG = Math.PI / 180;
const pad = (i: number) => String(i + 1).padStart(2, "0");
const n1 = (v: number) => v.toFixed(1);
const attr = (el: Element, name: string, value: string | number) => el.setAttribute(name, String(value));
const move = (el: Element, x: number, y: number, scale = 1) =>
  el.setAttribute("transform", `translate(${n1(x)} ${n1(y)})${scale !== 1 ? ` scale(${scale.toFixed(3)})` : ""}`);

/**
 * One continuous scene: a pinned stage holds the approval universe while a
 * flow layer carries the hero copy and the six stage panels. A single
 * animation loop reads scroll once per frame and derives everything from
 * (hero→journey blend `t`, fractional stage `s`, ambient `time`).
 */
export function ApprovalJourney() {
  const rootRef = useRef<HTMLElement>(null);
  const { stage: active, inJourney } = useJourney();

  useEffect(() => {
    const rootNode = rootRef.current;
    if (!rootNode) return;
    const root: HTMLElement = rootNode;
    const stage = root.querySelector<HTMLElement>(".uj-stage")!;
    const svg = stage.querySelector<SVGSVGElement>('[data-u="svg"]')!;
    const u = <T extends Element>(name: string) => stage.querySelector(`[data-u="${name}"]`) as T;
    const uAll = <T extends Element>(name: string) => Array.from(stage.querySelectorAll(`[data-u="${name}"]`)) as T[];
    const j = <T extends HTMLElement>(name: string) => root.querySelector(`[data-j="${name}"]`) as T;

    const el = {
      glowHero: u<HTMLElement>("glow-hero"),
      glowJourney: u<HTMLElement>("glow-journey"),
      stars: uAll<SVGGElement>("stars"),
      contourFar: u<SVGGElement>("contour-far"),
      contourGround: u<SVGGElement>("contour-ground"),
      endcap: u<SVGGElement>("endcap"),
      contourNear: u<SVGGElement>("contour-near"),
      hubDecor: u<SVGGElement>("hub-decor"),
      hubRings: u<SVGGElement>("hub-rings"),
      rings: uAll<SVGEllipseElement>("ring"),
      wave: u<SVGEllipseElement>("wave"),
      spokes: uAll<SVGPathElement>("spoke"),
      closure: u<SVGPathElement>("route-closure"),
      base: u<SVGPathElement>("route-base"),
      glow: u<SVGPathElement>("route-glow"),
      lit: u<SVGPathElement>("route-lit"),
      comet: u<SVGPathElement>("comet"),
      sats: uAll<SVGGElement>("sat"),
      hub: u<SVGGElement>("hub"),
      hubHalo: u<SVGCircleElement>("hub-halo"),
      hubLabel: u<SVGTextElement>("hub-label"),
      hubCore: u<SVGGElement>("hub-core"),
      packet: u<SVGGElement>("packet"),
      nodes: uAll<SVGGElement>("node").map((g) => ({
        g,
        ripple: g.querySelector('[data-r="ripple"]')!,
        pulse: g.querySelector('[data-r="pulse"]')!,
        halo: g.querySelector('[data-r="halo"]')!,
        body: g.querySelector('[data-r="body"]')!,
        num: g.querySelector('[data-r="num"]')!,
        check: g.querySelector('[data-r="check"]')!,
        label: g.querySelector('[data-r="label"]')!,
      })),
      btns: Array.from(stage.querySelectorAll<HTMLButtonElement>(".uj-nodebtn")),
      hero: j<HTMLElement>("hero"),
      jhead: j<HTMLElement>("jhead"),
      timeline: j<HTMLElement>("timeline"),
      tlFill: j<HTMLElement>("tl-fill"),
      tlMarker: j<HTMLElement>("tl-marker"),
      cards: Array.from(root.querySelectorAll<HTMLElement>(".uj-card")),
      cardList: j<HTMLElement>("cards"),
      railFill: j<HTMLElement>("rail-fill"),
      rail: j<HTMLElement>("rail"),
    };
    const packetBob = el.packet.querySelector('[data-r="bob"]')!;
    const packetLabel = el.packet.querySelector('[data-r="label"]') as SVGTextElement;
    const hubRing = el.hubCore.querySelectorAll("circle")[1]!;

    const mqPinned = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const S = {
      w: 0,
      h: 0,
      pinned: mqPinned.matches,
      reduce: mqReduce.matches,
      frame: { w: 1440, h: 900, pinned: true } as Frame,
      ho: null as unknown as Orbit,
      jo: null as unknown as Orbit,
      rootTop: 0,
      heroDist: 0,
      hold0: 0,
      stageDist: 0,
      D: 0,
      heroH: 0,
      fit: 1,
      centers: [] as number[],
      railTop: 0,
      railH: 0,
      Ys: window.scrollY,
      time: 0,
      act: -1,
      changedAt: -99,
      inJ: false,
      heroOn: true,
      journeyOn: false,
      visible: true,
      lastHeroOpacity: -1,
    };
    let raf = 0;
    let last = 0;
    let pending = 0;

    function resetInline() {
      el.hero.style.cssText = "";
      el.jhead.style.cssText = "";
      el.timeline.style.cssText = "";
      el.cards.forEach((card) => (card.style.cssText = ""));
      S.heroOn = true;
      S.journeyOn = false;
    }

    function measure() {
      const wasPinned = S.pinned;
      S.pinned = mqPinned.matches;
      S.reduce = mqReduce.matches;
      if (wasPinned !== S.pinned) resetInline();
      S.w = stage.clientWidth;
      S.h = stage.clientHeight;
      if (!S.w || !S.h) return;
      attr(svg, "viewBox", `0 0 ${S.w} ${S.h}`);
      const frame: Frame = { w: S.w, h: S.h, pinned: S.pinned };
      S.frame = frame;
      S.ho = heroOrbit(frame);
      S.jo = stackedJourneyOrbit(frame);

      if (S.pinned) {
        S.heroDist = 0.85 * S.h;
        S.hold0 = 0.12 * S.h;
        S.stageDist = 0.8 * S.h;
        S.D = S.heroDist + S.hold0 + (NODE_COUNT - 1) * S.stageDist + 0.3 * S.h;
        const total = `${Math.round(S.h + S.D)}px`;
        if (root.style.getPropertyValue("--uj-h") !== total) root.style.setProperty("--uj-h", total);
        const row = rowLayout(frame);
        el.cards.forEach((card) => {
          card.style.width = `${row.cardW}px`;
          card.style.top = `${row.cardTop}px`;
        });
        // Short viewports: shrink the panels so they never collide with the timeline.
        const tallest = Math.max(...el.cards.map((card) => card.offsetHeight), 1);
        S.fit = clamp((S.h - row.cardTop - 92) / tallest, 0.62, 1);
      } else {
        root.style.removeProperty("--uj-h");
        S.heroH = el.hero.offsetHeight;
        S.centers = el.cards.map((card) => card.getBoundingClientRect().top + window.scrollY + card.offsetHeight / 2);
        const first = el.cards[0]!;
        const lastCard = el.cards[NODE_COUNT - 1]!;
        S.railTop = first.offsetTop + first.offsetHeight / 2;
        S.railH = lastCard.offsetTop + lastCard.offsetHeight / 2 - S.railTop;
        el.rail.style.top = `${S.railTop}px`;
        el.rail.style.height = `${S.railH}px`;
      }
      S.rootTop = root.getBoundingClientRect().top + window.scrollY;

      const ratio = S.ho.ry / S.ho.rx;
      [0.34, 0.62, 1.34, 1.72].forEach((k, i) => {
        attr(el.rings[i]!, "rx", S.ho.rx * k);
        attr(el.rings[i]!, "ry", S.ho.rx * k * ratio);
      });
      attr(el.hubHalo, "r", S.ho.rx * 0.5);
    }

    function applyStates(act: number) {
      el.nodes.forEach((n, i) => {
        const stageDef = STAGES[i]!;
        const tone = TONE_HEX[stageDef.tone];
        let stroke = "#8F85DA";
        let strokeOpacity = 0.7;
        let fill = "#1d1744";
        let numFill = "#D5C8FF";
        let check = 0;
        let haloOpacity = 0.35;
        if (i < act) {
          stroke = TONE_HEX.emerald;
          strokeOpacity = 0.95;
          fill = "#143532";
          check = 1;
          haloOpacity = 0.45;
          attr(n.check, "stroke", TONE_HEX.emerald);
        } else if (i === act) {
          stroke = stageDef.attention ? TONE_HEX.amber : tone;
          strokeOpacity = 1;
          fill = "#2b2058";
          numFill = "#FAF7FF";
          haloOpacity = 1;
        } else if (stageDef.attention) {
          stroke = TONE_HEX.amber;
          strokeOpacity = 0.55;
        }
        attr(n.body, "stroke", stroke);
        attr(n.body, "stroke-opacity", strokeOpacity);
        attr(n.body, "fill", fill);
        attr(n.num, "fill", numFill);
        attr(n.num, "opacity", check ? 0 : 1);
        attr(n.check, "opacity", check);
        attr(n.halo, "opacity", haloOpacity);
        const ring = stageDef.attention ? TONE_HEX.amber : tone;
        attr(n.pulse, "stroke", ring);
        attr(n.ripple, "stroke", ring);
        attr(n.label, "fill", i === act ? "#FAF7FF" : "#D5C8FF");
        attr(n.label, "fill-opacity", i === act ? 1 : 0.7);
      });
      attr(hubRing, "stroke", STAGES[act]!.attention ? TONE_HEX.amber : TONE_HEX[STAGES[act]!.tone]);
      packetLabel.textContent = `${STAGES[act]!.packet.toUpperCase()} · SIMULATED`;
    }

    function drawFrame(dt: number) {
      if (!S.w) return;
      const { frame, ho, jo } = S;
      const sy = window.scrollY;
      if (S.reduce || Math.abs(S.Ys - sy) > S.h * 3) S.Ys = sy;
      else S.Ys += (sy - S.Ys) * (1 - Math.exp(-dt * 9));
      if (!S.reduce) S.time += dt;
      const time = S.time;

      /* ---- the single scroll model: t (hero→journey), s (stage) ---- */
      let t: number;
      let s: number;
      let y = S.Ys - S.rootTop;
      if (S.pinned) {
        y = clamp(y, 0, S.D);
        t = clamp(y / S.heroDist, 0, 1);
        s = plateau((y - S.heroDist - S.hold0) / S.stageDist);
      } else {
        t = clamp(y / (S.heroH * 0.7), 0, 1);
        const vc = S.Ys + S.h * 0.55;
        const c = S.centers;
        if (c.length < NODE_COUNT || vc <= c[0]!) s = 0;
        else if (vc >= c[NODE_COUNT - 1]!) s = NODE_COUNT - 1;
        else {
          let i = 0;
          while (i < NODE_COUNT - 2 && vc > c[i + 1]!) i++;
          const span = c[i + 1]! - c[i]!;
          s = i + (span > 1 ? (vc - c[i]!) / span : 0);
        }
      }
      const scene = computeScene(frame, t, s);
      const { e, hub, nodes } = scene;
      const act = Math.round(s);
      if (act !== S.act) {
        S.act = act;
        S.changedAt = time;
        applyStates(act);
        journeyStore.set({ stage: act });
      }
      const pastEnd = S.pinned ? S.Ys - S.rootTop > S.D + S.h * 0.5 : S.Ys + S.h * 0.55 > (S.centers[NODE_COUNT - 1] ?? 0) + S.h * 0.6;
      const inJ = t > 0.6 && !pastEnd;
      if (inJ !== S.inJ) {
        S.inJ = inJ;
        journeyStore.set({ inJourney: inJ });
      }

      /* ---- atmosphere ---- */
      el.glowHero.style.opacity = String(1 - e);
      el.glowJourney.style.opacity = String(e);
      const scrollPx = S.pinned ? y : S.Ys;
      el.stars.forEach((g, i) => {
        const f = [0.04, 0.09, 0.16][i] ?? 0;
        move(g, S.pinned ? -scrollPx * f : 0, S.pinned ? 0 : -scrollPx * f);
      });
      const cs = ho.rx / 320;
      attr(el.contourNear, "transform", `translate(${n1(ho.hub.x - (S.pinned ? y * 0.07 : 0))} ${n1(ho.hub.y - (S.pinned ? 0 : S.Ys * 0.06))}) scale(${(cs * lerp(1, 1.45, e)).toFixed(3)}) rotate(${(time * 0.35).toFixed(2)})`);
      attr(el.contourNear, "opacity", lerp(1, 0.55, e).toFixed(3));
      attr(el.contourGround, "transform", `translate(${n1(S.w * 0.16 - (S.pinned ? y * 0.025 : 0))} ${n1(S.h * 0.92)}) scale(${clamp(S.w / 1000, 0.5, 1.3).toFixed(3)}) rotate(${(time * 0.25).toFixed(2)})`);
      attr(el.contourGround, "opacity", S.pinned ? 1 : 0.6);
      attr(el.contourFar, "transform", `translate(${n1(ho.hub.x * 0.86 - (S.pinned ? y * 0.03 : 0))} ${n1(ho.hub.y * 1.08 - (S.pinned ? 0 : S.Ys * 0.03))}) scale(${(cs * 1.25).toFixed(3)}) rotate(${(-time * 0.2).toFixed(2)})`);

      /* ---- hub ---- */
      const breathe = 1 + 0.035 * Math.sin(time * 1.7);
      move(el.hubDecor, hub.x, hub.y, scene.hubScale);
      attr(el.hubRings, "transform", `rotate(${scene.tilt})`);
      el.rings.forEach((ring, i) => attr(ring, "opacity", (0.85 + 0.15 * Math.sin(time * 1.3 + i * 1.4)).toFixed(3)));
      const wk = (time * 0.26) % 1;
      attr(el.wave, "rx", ho.rx * (0.12 + 0.5 * wk));
      attr(el.wave, "ry", ho.ry * (0.12 + 0.5 * wk));
      attr(el.wave, "opacity", ((1 - wk) * 0.5 * (S.reduce ? 0 : 1)).toFixed(3));
      move(el.hub, hub.x, hub.y, scene.hubScale * breathe);
      attr(el.hubHalo, "opacity", (0.8 + 0.2 * Math.sin(time * 1.1)).toFixed(3));

      /* ---- route ---- */
      const segs = buildRoute(nodes, S.pinned ? e : 0);
      const mainD = routeD(segs, 0, 5);
      const closureD = `M${n1(nodes[5]!.x)} ${n1(nodes[5]!.y)}${segTo(segs[5]!)}`;
      const lenLoop = totalLen(segs, 6);
      attr(el.base, "d", mainD);
      attr(el.glow, "d", mainD);
      attr(el.lit, "d", mainD);
      attr(el.closure, "d", closureD);
      attr(el.closure, "opacity", S.pinned ? 1 - e : 1);
      attr(el.base, "stroke-dashoffset", -time * 12);
      const jp = along(segs, s, NODE_COUNT - 1);
      attr(el.lit, "stroke-dasharray", `${jp.len.toFixed(1)} 99999`);
      attr(el.glow, "stroke-dasharray", `${jp.len.toFixed(1)} 99999`);
      const litOpacity = S.pinned ? e : 1;
      attr(el.lit, "opacity", litOpacity);
      attr(el.glow, "opacity", litOpacity);

      const loopParam = (time * 0.3) % 6;
      const lp = along(segs, loopParam, 6);
      attr(el.comet, "d", mainD + segTo(segs[5]!));
      const tail = Math.min(lenLoop * 0.2, lp.len);
      attr(el.comet, "stroke-dasharray", `${tail.toFixed(1)} 99999`);
      attr(el.comet, "stroke-dashoffset", -(lp.len - tail));
      attr(el.comet, "opacity", ((1 - e) * 0.9 * (S.reduce ? 0 : 1)).toFixed(3));

      const hubP = hub;
      el.spokes.forEach((spoke, i) => {
        const n = nodes[i]!;
        const mx = (hubP.x + n.x) / 2;
        const my = (hubP.y + n.y) / 2;
        const dx = n.x - hubP.x;
        const dy = n.y - hubP.y;
        attr(spoke, "d", `M${n1(hubP.x)} ${n1(hubP.y)}Q${n1(mx - dy * 0.1)} ${n1(my + dx * 0.1)} ${n1(n.x)} ${n1(n.y)}`);
        const o = S.pinned ? (i === 0 ? lerp(0.5, 1, e) : (1 - e) * 0.45) : 0.34;
        attr(spoke, "opacity", o.toFixed(3));
      });

      /* ---- label geometry, shared so nothing is placed on top of anything else ---- */
      const narrow = !S.pinned && S.w < 640;
      // Each label keeps a fixed offset from its node (outside the orbit in the hero, above the node
      // in the journey) and cross-fades between the two as that node peels off, so it never drags
      // across its own node body. It also fades before it could touch a viewport edge.
      const labels = nodes.map((p, i) => {
        const o = scene.outward[i]!;
        const ei = S.pinned ? nodeBlend(t, i) : 0;
        const journey = ei >= 0.5;
        const lx = narrow ? o.x * 10 : journey ? 0 : o.x * 62;
        const ly = narrow ? (o.y > 0 ? 34 : -26) : journey ? -36 : o.y * 40 + 4;
        const half = STAGES[i]!.label.length * 4.1;
        const x = p.x + lx;
        const swap = narrow ? 1 : journey ? smoothstep(0.5, 0.8, ei) : 1 - smoothstep(0.2, 0.5, ei);
        const edge = smoothstep(4, 12, Math.min(x - half, S.w - (x + half)));
        return { lx, ly, x, y: p.y + ly, half, op: swap * edge };
      });
      // 0 = overlapping, 1 = clear. Boxes are centre + half-extent; fully hidden until they stop touching.
      const clearance = (ax: number, ay: number, ahw: number, ahh: number, bx: number, by: number, bhw: number, bhh: number) =>
        smoothstep(1, 1.6, Math.max(Math.abs(ax - bx) / (ahw + bhw), Math.abs(ay - by) / (ahh + bhh)));

      /* ---- packet (ambient orbit → stage-driven) ---- */
      const pos = lerpPt(lp.pt, jp.pt, e);
      attr(el.packet, "transform", `translate(${n1(pos.x)} ${n1(pos.y)}) scale(${(1 + 0.05 * Math.sin(time * 2.4)).toFixed(3)})`);
      attr(packetBob, "transform", `translate(0 ${(Math.sin(time * 2) * 1.6).toFixed(2)})`);
      // The status label rides outside the orbit (away from the route) and steps aside
      // for node labels; once the journey takes over, the active card carries the status.
      const pdx = pos.x - hub.x;
      const pdy = pos.y - hub.y;
      const pl = Math.hypot(pdx, pdy) || 1;
      const pox = pdx / pl;
      const poy = pdy / pl;
      const anchor = pox > 0.35 ? "start" : pox < -0.35 ? "end" : "middle";
      const plx = pox * 30 + (anchor === "start" ? 6 : anchor === "end" ? -6 : 0);
      const ply = poy * 28 + (poy > 0.4 ? 12 : 2);
      attr(packetLabel, "x", n1(plx));
      attr(packetLabel, "y", n1(ply));
      attr(packetLabel, "text-anchor", anchor);
      const pcx = pos.x + plx + (anchor === "start" ? 80 : anchor === "end" ? -80 : 0);
      const pcy = pos.y + ply;
      // keep the label inside the viewport (it rides the right edge of the orbit)
      let packetClear = (1 - smoothstep(0, 0.3, e)) * smoothstep(0, 28, Math.min(pcx - 80, S.w - (pcx + 80)));
      for (const l of labels) if (l.op > 0.05) packetClear = Math.min(packetClear, clearance(pcx, pcy, 84, 10, l.x, l.y, l.half + 4, 12));
      attr(packetLabel, "opacity", S.w < 520 ? 0 : packetClear.toFixed(3));

      /* ---- hub label: stays while the hub is on screen, yields to nodes ---- */
      const hubLabelY = hub.y + 70 * scene.hubScale;
      const hubLabelHalf = 78 * scene.hubScale * 1.04;
      let hubLabelClear = S.pinned ? smoothstep(20, 150, hub.x) : 1 - smoothstep(0.1, 0.5, e);
      if (narrow) hubLabelClear = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        const l = labels[i]!;
        const p = nodes[i]!;
        if (l.op > 0.05) hubLabelClear = Math.min(hubLabelClear, clearance(hub.x, hubLabelY, hubLabelHalf, 10, l.x, l.y, l.half + 4, 12));
        hubLabelClear = Math.min(hubLabelClear, clearance(hub.x, hubLabelY, hubLabelHalf, 10, p.x, p.y, 22, 22));
      }
      attr(el.hubLabel, "opacity", hubLabelClear.toFixed(3));

      /* ---- decision endpoint ---- */
      const end = nodes[NODE_COUNT - 1]!;
      const endGlow = S.pinned ? e * (0.4 + 0.6 * smoothstep(3.8, 5, s)) : 0;
      attr(el.endcap, "transform", `translate(${n1(end.x)} ${n1(end.y)}) scale(${(1 + 0.03 * Math.sin(time * 1.6)).toFixed(3)})`);
      attr(el.endcap, "opacity", endGlow.toFixed(3));

      /* ---- evidence satellites ---- */
      const center = lerpPt(hub, jp.pt, e);
      const heroRatio = ho.ry / ho.rx;
      const jScale = S.pinned ? rowLayout(frame).spacing / 340 : jo.rx / 190;
      el.sats.forEach((g, k) => {
        const def = SATS[k]!;
        const rx = lerp(ho.rx * def.rh, def.rj * jScale, e);
        const ry = rx * lerp(heroRatio, 0.62, e);
        const a = def.phase + time * def.speed;
        const lx = Math.cos(a) * rx;
        const ly = Math.sin(a) * ry;
        const rot = (def.tilt + lerp(ho.tilt, 0, e)) * DEG;
        const depth = (Math.sin(a) + 1) / 2;
        move(g, center.x + lx * Math.cos(rot) - ly * Math.sin(rot), center.y + lx * Math.sin(rot) + ly * Math.cos(rot), 0.85 + 0.3 * depth);
        const sx = center.x + lx * Math.cos(rot) - ly * Math.sin(rot);
        const sy2 = center.y + lx * Math.sin(rot) + ly * Math.cos(rot);
        let satClear = 1;
        for (const l of labels) if (l.op > 0.05) satClear = Math.min(satClear, clearance(sx, sy2, 14, 14, l.x, l.y, l.half + 4, 12));
        if (packetClear > 0.05) satClear = Math.min(satClear, clearance(sx, sy2, 14, 14, pcx, pcy, 84, 10));
        if (hubLabelClear > 0.05) satClear = Math.min(satClear, clearance(sx, sy2, 14, 14, hub.x, hubLabelY, hubLabelHalf, 10));
        if (S.pinned) {
          // stay clear of the journey heading and the decision terminal tick
          satClear *= lerp(1, smoothstep(175, 215, sy2), e);
          satClear = Math.min(satClear, 1 - (1 - clearance(sx, sy2, 10, 10, end.x + 48, end.y, 22, 14)) * endGlow);
        }
        attr(g, "opacity", ((0.45 + 0.5 * depth) * satClear).toFixed(3));
      });

      /* ---- nodes ---- */
      el.nodes.forEach((n, i) => {
        const p = nodes[i]!;
        const isActive = i === act;
        move(n.g, p.x, p.y, isActive ? 1.18 : 1);
        const lab = labels[i]!;
        attr(n.label, "x", n1(lab.lx));
        attr(n.label, "y", n1(lab.ly));
        attr(n.label, "opacity", ((S.pinned ? 1 : lerp(1, isActive ? 1 : 0, e)) * lab.op).toFixed(3));
        attr(n.pulse, "opacity", isActive ? 0.55 : 0);
        attr(n.pulse, "r", (26 + 3 * Math.sin(time * 3)).toFixed(2));
        const age = time - S.changedAt;
        if (isActive && age >= 0 && age < 1.3) {
          attr(n.ripple, "r", (17 + age * 42).toFixed(1));
          attr(n.ripple, "opacity", ((1 - age / 1.3) * 0.75).toFixed(3));
        } else attr(n.ripple, "opacity", 0);
      });

      /* ---- clickable node overlay (kept on the same positions) ---- */
      el.btns.forEach((btn, i) => {
        const p = nodes[i]!;
        const onscreen = p.x > -30 && p.x < S.w + 30 && p.y > 40 && p.y < S.h - 20;
        btn.style.transform = `translate3d(${n1(p.x - 24)}px, ${n1(p.y - 24)}px, 0)`;
        const vis = onscreen ? "visible" : "hidden";
        if (btn.style.visibility !== vis) btn.style.visibility = vis;
      });

      /* ---- layers that depend on the mode ---- */
      if (S.pinned) {
        const heroOpacity = 1 - smoothstep(0, 0.5, t);
        const heroOn = heroOpacity > 0.01;
        if (heroOn !== S.heroOn || Math.abs(heroOpacity - S.lastHeroOpacity) > 0.002) {
          el.hero.style.opacity = heroOpacity.toFixed(3);
          el.hero.style.transform = `translate3d(0, ${(-e * 56).toFixed(1)}px, 0)`;
          el.hero.style.visibility = heroOn ? "visible" : "hidden";
          S.heroOn = heroOn;
          S.lastHeroOpacity = heroOpacity;
        }
        const jf = smoothstep(0.5, 0.95, t);
        const jOn = jf > 0.01;
        el.jhead.style.opacity = jf.toFixed(3);
        el.timeline.style.opacity = jf.toFixed(3);
        el.jhead.style.transform = `translate3d(0, ${((1 - jf) * 24).toFixed(1)}px, 0)`;
        el.timeline.style.transform = `translate3d(0, ${((1 - jf) * 24).toFixed(1)}px, 0)`;
        if (jOn !== S.journeyOn) {
          const v = jOn ? "visible" : "hidden";
          el.jhead.style.visibility = v;
          el.timeline.style.visibility = v;
          S.journeyOn = jOn;
        }
        const row = rowLayout(frame);
        el.cards.forEach((card, i) => {
          const dist = Math.abs(i - s);
          const x = S.w / 2 + (i - s) * row.spacing - row.cardW / 2;
          const sc = lerp(1, 0.92, clamp(dist, 0, 1)) * S.fit;
          const op = clamp(1 - dist * 0.2, 0.58, 1) * jf;
          card.style.transform = `translate3d(${n1(x)}px, ${((1 - jf) * 40).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
          card.style.opacity = op.toFixed(3);
          const vis = jOn && x > -row.cardW && x < S.w ? "visible" : "hidden";
          if (card.style.visibility !== vis) card.style.visibility = vis;
        });
        el.tlFill.style.transform = `scaleX(${(s / (NODE_COUNT - 1)).toFixed(4)})`;
        el.tlMarker.style.left = `${(((s + 0.5) / NODE_COUNT) * 100).toFixed(3)}%`;
      } else {
        const first = S.railTop;
        const i = Math.min(NODE_COUNT - 2, Math.floor(s));
        const f = s >= NODE_COUNT - 1 ? 1 : s - i;
        const ci = el.cards[i]!;
        const cj = el.cards[i + 1]!;
        const mid = (ci.offsetTop + ci.offsetHeight / 2) * (1 - f) + (cj.offsetTop + cj.offsetHeight / 2) * f;
        el.railFill.style.height = `${Math.max(0, mid - first).toFixed(1)}px`;
      }
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      drawFrame(dt);
    }

    function sync() {
      const run = S.visible && !document.hidden && !S.reduce;
      if (run && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (S.reduce) scheduleOnce();
    }

    function scheduleOnce() {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        drawFrame(0);
      });
    }

    const onResize = () => {
      measure();
      S.Ys = window.scrollY;
      sync();
      if (!raf) scheduleOnce();
    };
    const onScroll = () => {
      if (S.reduce) scheduleOnce();
    };

    journeyStore.goToStage = (index: number) => {
      const i = clamp(Math.round(index), 0, NODE_COUNT - 1);
      const top = S.pinned
        ? S.rootTop + S.heroDist + S.hold0 + i * S.stageDist + 1
        : S.centers[i]! - S.h * 0.55 + 2;
      window.scrollTo({ top, behavior: S.reduce ? "auto" : "smooth" });
    };

    measure();
    S.Ys = window.scrollY;
    applyStates(0);
    S.act = 0;
    drawFrame(0);

    const ro = new ResizeObserver(onResize);
    ro.observe(stage);
    ro.observe(el.cardList);
    const io = new IntersectionObserver(
      (entries) => {
        S.visible = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { rootMargin: "160px 0px" },
    );
    io.observe(root);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", sync);
    mqPinned.addEventListener("change", onResize);
    mqReduce.addEventListener("change", onResize);
    document.fonts?.ready.then(() => onResize());
    sync();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", sync);
      mqPinned.removeEventListener("change", onResize);
      mqReduce.removeEventListener("change", onResize);
      journeyStore.goToStage = null;
      journeyStore.set({ stage: 0, inJourney: false });
    };
  }, []);

  const go = (index: number) => journeyStore.goToStage?.(index);

  const onTimelineKey = (event: KeyboardEvent<HTMLElement>) => {
    const dir = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    event.preventDefault();
    const stops = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const focused = stops.indexOf(document.activeElement as HTMLButtonElement);
    const next = clamp((focused >= 0 ? focused : active) + dir, 0, NODE_COUNT - 1);
    go(next);
    stops[next]?.focus({ preventScroll: true });
  };

  return (
    <section id="workflow" ref={rootRef} className="uj-root" aria-label="Veridion approval workflow journey">
      <div className="uj-stage">
        <div className="uj-bg" aria-hidden="true">
          <div data-u="glow-hero" className="uj-glow-hero" />
          <div data-u="glow-journey" className="uj-glow-journey" />
        </div>
        <UniverseSvg />
        <div className="uj-nodebtns">
          {STAGES.map((stage, i) => (
            <button
              key={stage.label}
              type="button"
              className="uj-nodebtn"
              onClick={() => go(i)}
              aria-label={`Stage ${i + 1} of ${NODE_COUNT}: ${stage.label}`}
              aria-current={active === i && inJourney ? "step" : undefined}
            />
          ))}
        </div>
        <div className="uj-vignette" aria-hidden="true" />
      </div>

      <div className="uj-flow">
        <div className="uj-hero" data-j="hero">
          <div className="uj-hero-inner">
            <p className="uj-eyebrow">
              <span className="uj-rule" /> Veridion <em>AICTE Approval Cloud</em>
            </p>
            <h1 className="uj-h1">
              Every approval,
              <br />
              <span className="text-gradient">traced end to end.</span>
            </h1>
            <p className="uj-lede">
              One connected record for declaration, handbook validation, scrutiny, remediation, inspection and the final decision, with
              every transition auditable.
            </p>
            <div className="uj-ctas">
              <Link href="/login" className="uj-btn uj-btn-primary">
                Enter the workspace <ArrowRight className="h-4 w-4" />
              </Link>
              <button type="button" className="uj-btn uj-btn-ghost" onClick={() => go(0)}>
                Trace the six stages <ArrowDownRight className="h-4 w-4" />
              </button>
            </div>
            <p className="uj-note">
              <span className="uj-pip" /> Illustrative demo data, not connected to live AICTE systems
            </p>
          </div>
          <div className="uj-cue" aria-hidden="true">
            <span /> Scroll to enter the workflow
          </div>
        </div>

        <div className="uj-journey" data-j="journey">
          <div className="uj-hud" role="group" aria-label="Journey progress">
            <span className="uj-hud-stage">
              <b>{pad(active)}</b> / {pad(NODE_COUNT - 1)} · {STAGES[active]?.label}
            </span>
            <span className="uj-hud-ticks">
              {STAGES.map((stage, i) => (
                <button
                  key={stage.label}
                  type="button"
                  className={cn("uj-hud-tick", active === i && "is-active", i < active && "is-done")}
                  onClick={() => go(i)}
                  aria-label={`Go to stage ${i + 1}: ${stage.label}`}
                  aria-current={active === i ? "step" : undefined}
                />
              ))}
            </span>
          </div>
          <div className="uj-jhead" data-j="jhead">
            <div>
              <p className="uj-eyebrow">
                <span className="uj-rule" /> Workflow journey <em>Stage {pad(active)} / {pad(NODE_COUNT - 1)}</em>
              </p>
              <h2 className="uj-h2">Six stages. One continuous record.</h2>
            </div>
            <p className="uj-sim">
              <span className="uj-pip" /> Simulated demonstration data
            </p>
          </div>

          <div className="uj-cardwrap" data-j="cards">
            <div className="uj-rail" data-j="rail" aria-hidden="true">
              <div className="uj-rail-fill" data-j="rail-fill" />
            </div>
            <ol className="uj-cards">
            {STAGES.map((stage, i) => (
              <li
                key={stage.label}
                className={cn("uj-card", active === i && "is-active", i < active && "is-done")}
                data-tone={stage.tone}
                data-attention={stage.attention ? "true" : undefined}
                onClick={() => go(i)}
              >
                <span className="uj-dot" aria-hidden="true" />
                <div className="uj-card-top">
                  <span className="uj-num">{pad(i)}</span>
                  <span className="uj-tag">{stage.actor}</span>
                </div>
                <h3 className="uj-card-title">{stage.label}</h3>
                <p className="uj-card-body">{stage.summary}</p>
                <div className="uj-meter" role="img" aria-label={stage.meterLabel}>
                  <span style={{ width: `${Math.round(stage.meter * 100)}%` }} />
                </div>
                <p className="uj-meter-label">{stage.meterLabel}</p>
                <dl className="uj-metrics">
                  {stage.metrics.map((metric) => (
                    <div key={metric.label}>
                      <dt>{metric.label}</dt>
                      <dd>{metric.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="uj-card-foot">Simulated · {stage.packet}</p>
              </li>
            ))}
            </ol>
          </div>

          <nav className="uj-timeline" data-j="timeline" aria-label="Approval stages" onKeyDown={onTimelineKey}>
            <div className="uj-tl-track" aria-hidden="true">
              <div className="uj-tl-line">
                <div className="uj-tl-fill" data-j="tl-fill" />
              </div>
              <span className="uj-tl-marker" data-j="tl-marker" />
            </div>
            <ol>
              {STAGES.map((stage, i) => (
                <li key={stage.label}>
                  <button
                    type="button"
                    className={cn("uj-tl-stop", active === i && "is-active", i < active && "is-done")}
                    aria-current={active === i ? "step" : undefined}
                    onClick={() => go(i)}
                  >
                    <span className="uj-tl-dot" aria-hidden="true" />
                    <span className="uj-tl-num">{pad(i)}</span>
                    <span className="uj-tl-label">{stage.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </section>
  );
}
