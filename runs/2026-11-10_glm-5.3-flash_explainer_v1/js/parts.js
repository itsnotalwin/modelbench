/* =============================================================
   parts.js — what every component IS (static) and what it is
   DOING right now (dynamic). Dynamic builders receive the exact
   per-angle state `pt` computed by EngineModel.point().
   ============================================================= */
(function (global) {
'use strict';
const M = global.EngineModel;
const f1 = x => x.toFixed(1);
const f2 = x => x.toFixed(2);
const f0 = x => Math.round(x).toString();
const sign = x => (x >= 0 ? '+' : '−');
const abs = Math.abs;

function dirWord(v, into, out) { return v > 0.06 ? into : (v < -0.06 ? out : 'barely moving'); }
function side() { return 'intake side'; }

const PARTS = {
  piston: {
    name: 'Piston', tag: 'forged aluminium alloy',
    spec: 'Ø 86.0 mm · compression height 35 mm · skirt with oil-control cut',
    body: `The piston converts gas pressure into a linear push. Its crown sees the full
      combustion load; three ring grooves carry the seal; the skirt guides it in the bore.
      It reverses direction twice per revolution, so at speed its own inertia becomes a
      force comparable to the gas load.`,
    dyn(pt, ctx) {
      const kN = abs(pt.Fg) / 1000;
      const phase = ['drawing in a fresh charge', 'compressing the charge',
        'being driven down by combustion', 'pushing spent gas out'][pt.phase];
      return {
        rows: [
          ['position', f1(pt.x) + ' mm from TDC'],
          ['velocity', f2(pt.v) + ' m/s ' + (pt.v >= 0 ? '↓' : '↑')],
          ['gas load on crown', f2(kN) + ' kN'],
          ['inertia load', f2(abs(ctx.fi) / 1000) + ' kN'],
          ['acceleration', f0(pt.a) + ' m/s²']
        ],
        say: `At ${f0(pt.th)}° the piston is ${phase}; the gas above it pushes with
          ${f2(kN)} kN while its own mass reacts with ${f2(abs(ctx.fi) / 1000)} kN of inertia.
          Peak gas load arrives just after firing TDC.`
      };
    }
  },
  rings: {
    name: 'Ring pack', tag: '2 compression rings + oil control',
    spec: 'sealed against ~70 bar peak · oil ring scraped at skirt',
    body: `Two compression rings seal the gap between piston and bore against cylinder
      pressure; the third ring scrapes oil back down the liner. Ring gap and tension are
      a compromise: tight enough to seal, loose enough to survive thermal growth.`,
    dyn(pt, ctx) {
      if (ctx.faults.rings) {
        return {
          rows: [
            ['peak pressure now', f1(ctx.cycle.peakP) + ' bar (stock ' + f1(ctx.base ? ctx.base.peakP : 0) + ')'],
            ['net work now', f1(ctx.cycle.IMEPbar) + ' bar IMEP'],
            ['blow-by', 'worn rings — charge leaking past the gaps']
          ],
          say: `The worn ring gaps let high-pressure gas bleed into the crankcase all
            through compression and power. The compression line on the P–θ chart sags
            below the stock dashed curve and peak pressure falls by roughly a quarter —
            torque and fuel economy go with it, and oil is pulled upward into the chamber.`
        };
      }
      return {
        rows: [
          ['pressure sealed', f1(pt.P) + ' bar'],
          ['position', f1(pt.x) + ' mm from TDC']
        ],
        say: pt.phase === 1 || pt.phase === 2
          ? `Sealing ${f1(pt.P)} bar against the bore. The compression rings sit in their grooves under gas pressure, which presses them outward onto the liner.`
          : `Riding through the ${['intake', 'exhaust'][pt.phase === 0 ? 0 : 1]} stroke at low pressure — the rings' job right now is to keep oil where it belongs.`
      };
    }
  },
  rod: {
    name: 'Connecting rod', tag: 'forged steel, I-beam',
    spec: 'centre-to-centre 150.0 mm · big end on Ø 43 mm crank pin',
    body: `The rod turns the piston's straight-line motion into crank rotation. It is
      loaded in compression when gas pushes the piston down, and in tension when
      inertia flings the piston away from TDC at high rpm. Its length sets the
      secondary motion of the piston (the cos 2θ term).`,
    dyn(pt, ctx) {
      const F = abs(ctx.fnet) / 1000;
      const mode = ctx.fnet >= 0 ? 'compression' : 'tension';
      return {
        rows: [
          ['inclination', f1(abs(pt.rod) * 180 / Math.PI) + '° from bore axis'],
          ['axial load', f2(F) + ' kN ' + mode],
          ['crank pin at', f0(pt.th) + '° of its 360° circle']
        ],
        say: `The rod is leaning ${f1(abs(pt.rod) * 180 / Math.PI)}° off the bore axis and carrying
          ${f2(F)} kN in ${mode}. Around firing TDC gas load squeezes it; near TDC at high rpm,
          inertia can stretch it — con-rods break in tension, not compression.`
      };
    }
  },
  crank: {
    name: 'Crankshaft & counterweight', tag: 'nitrided steel, radius 43 mm',
    spec: 'throw 43 mm = half the 86 mm stroke · counterweight balances ~62 % of reciprocating mass',
    body: `The crank converts torque into rotation. Its radius is exactly half the stroke;
      the counterweight fan opposes the crank pin and damps the inertia imbalance a
      single cylinder is famous for. The flywheel side of the story is what turns the
      spiky gas torque into smooth output.`,
    dyn(pt, ctx) {
      const t = pt.Tg, ti = pt.Ti;
      return {
        rows: [
          ['gas torque', f0(t) + ' N·m (' + (t >= 0 ? 'driving' : 'resisting') + ')'],
          ['inertia torque', f0(ti) + ' N·m'],
          ['instantaneous sum', f0(t + ti) + ' N·m'],
          ['cycle mean', f0(ctx.cycle.torqueMean) + ' N·m']
        ],
        say: Math.abs(t) < 8 && abs(ti) < 8
          ? `Near TDC the torque arm is nearly zero — even huge gas force makes little torque here. The piston accelerates through dead centre.`
          : `Gas torque is ${f0(t)} N·m right now; reciprocating inertia adds ${f0(ti)} N·m.
            Over the whole 720° cycle they average to ${f0(ctx.cycle.torqueMean)} N·m — the flywheel absorbs the difference.`
      };
    }
  },
  crankcase: {
    name: 'Crankcase & sump', tag: 'cast aluminium',
    spec: 'oil sump below · main bearings either side of the web',
    body: `The crankcase closes the bottom of the engine, carries the main bearings and
      holds the oil. In a single-cylinder engine it also breathes: blow-by gas that slips
      past the rings is vented, not sealed in.`,
    dyn() {
      return {
        rows: [['oil', 'splash-fed, crank clearance ~8 mm']],
        say: `The counterweight swings just above the oil surface — close enough for splash lubrication, never touching.`
      };
    }
  },
  liner: {
    name: 'Cylinder liner', tag: 'honed cast iron / alu block',
    spec: 'Ø 86.0 mm bore · cross-honed 45° · liquid-cooled jacket outside',
    body: `The liner is the piston's straight guide and the gas-tight wall of the
      combustion space. Honing leaves microscopic cross-hatch grooves that hold an oil
      film; the coolant jacket outside carries away roughly a third of the fuel's energy.`,
    dyn(pt) {
      return {
        rows: [
          ['wall pressure', f1(pt.P) + ' bar pushing outward'],
          ['piston at', f1(pt.x) + ' mm from TDC']
        ],
        say: `Cylinder pressure loads the liner walls outward at ${f1(pt.P)} bar right now.
          At full load the jacket takes away more heat than the exhaust gas carries.`
      };
    }
  },
  head: {
    name: 'Cylinder head', tag: 'cast aluminium, pent-roof',
    spec: 'pent-roof chamber · 4 valves would sit here on a bigger bore — this single runs 2',
    body: `The head seals the top of the cylinder and hosts everything the charge passes
      through: ports, valve seats, the spark plug well and the cam carrier. The pent-roof
      shape points both valves at the central plug for a short, fast flame path.`,
    dyn(pt) {
      return {
        rows: [
          ['chamber pressure', f1(pt.P) + ' bar'],
          ['chamber volume', f0(pt.Vcc) + ' cm³']
        ],
        say: `The head is holding ${f1(pt.P)} bar at ${f0(pt.Vcc)} cm³. At full load it must survive
          a combustion blast every 720° and shed the heat continuously.`
      };
    }
  },
  chamber: {
    name: 'Chamber & charge', tag: 'pent-roof, central plug',
    spec: 'clearance volume ≈ 52.6 cm³ at 10.5:1 · trapped at IVC',
    body: `The space between piston crown and pent roof at TDC is the clearance volume.
      Compression ratio is the ratio of full swept volume to it. Everything the engine
      does — pressure, burn, work — happens inside this wedge.`,
    dyn(pt, ctx) {
      const burn = pt.xb;
      return {
        rows: [
          ['volume', f0(pt.Vcc) + ' cm³'],
          ['pressure', f1(pt.P) + ' bar'],
          ['burned fraction', pt.phase >= 2 ? f0(burn * 100) + ' %' : '—'],
          ['trapped mass proxy', f2(ctx.cycle.P220) + ' bar at IVC']
        ],
        say: pt.phase === 0
          ? `Filling: the falling piston lowers the pressure to ${f1(pt.P)} bar and manifold air rushes in past the intake valve.`
          : pt.phase === 1
            ? `Compressing: volume shrinks, so pressure rises as V^(1.32) — currently ${f1(pt.P)} bar in ${f0(pt.Vcc)} cm³.`
            : pt.phase === 2
              ? `Burning and expanding: ${f0(burn * 100)} % of the charge has burned, holding ${f1(pt.P)} bar as the piston extracts work.`
              : `Exhausting: pressure is near the back-pressure level (${f1(pt.P)} bar); the piston is sweeping the spent gas out.`
      };
    }
  },
  portin: {
    name: 'Intake port & runner', tag: 'c shaped, wet-flow', 
    spec: 'feeds the intake seat · throttle body upstream',
    body: `The port's job is to move air with the least loss. Its shape trades swirl,
      tumble and flow coefficient; at full lift a modern port flows near the speed of
      sound locally around the valve.`,
    dyn(pt, ctx) {
      const fl = ctx.flows.in;
      return {
        rows: [
          ['flow', dirWord(fl, 'into cylinder', 'back into manifold') + ' (' + f2(fl) + ')'],
          ['manifold', f2(ctx.cycle.Pman) + ' bar abs']
        ],
        say: fl > 0.06
          ? `Fresh charge is flowing toward the seat. The dashes on the port show direction and strength; they reverse if the cylinder ever exceeds manifold pressure.`
          : fl < -0.06
            ? `Gas is pushing BACK into the intake — the valve is open when it should be sealing (fault mode).`
            : `Port idle: the intake valve is effectively closed, so almost nothing moves.`
      };
    }
  },
  portex: {
    name: 'Exhaust port & runner', tag: 'short side exit',
    spec: 'blow-down followed by displacement exhaust',
    body: `When the exhaust valve opens near BDC, the cylinder is still at several bar:
      the pressure difference blows the first mass of gas out at near-sonic speed
      ("blow-down"), then the piston sweeps the rest out ("displacement").`,
    dyn(pt, ctx) {
      const fl = ctx.flows.ex;
      return {
        rows: [
          ['flow', dirWord(fl, 'out to header', 'reversing inward') + ' (' + f2(fl) + ')'],
          ['cylinder pressure', f1(pt.P) + ' bar vs ' + f2(M.P_EXH) + ' back-pressure']
        ],
        say: fl > 0.06
          ? `Spent gas is leaving. During blow-down this flow briefly peaks far above anything the piston could push.`
          : fl < -0.06
            ? `Flow is reversing — fresh charge is escaping into the exhaust (overlap), or a broken valve is letting compression leak away.`
            : `Little flow: the exhaust valve is nearly seated.`
      };
    }
  },
  throttle: {
    name: 'Throttle', tag: 'butterfly valve',
    spec: 'angle maps to manifold pressure 0.28 – 0.98 bar abs',
    body: `The throttle plate throttles the engine by throttling the manifold pressure:
      the cylinder fills to whatever the plate lets through. Less manifold pressure means
      a smaller trapped charge — the whole pressure curve scales down with it.`,
    dyn(pt, ctx) {
      return {
        rows: [
          ['plate', f0(ctx.cfg.throttle) + ' % open'],
          ['manifold pressure', f2(ctx.cycle.Pman) + ' bar abs'],
          ['trapped at IVC', f2(ctx.cycle.P220) + ' bar']
        ],
        say: `At ${f0(ctx.cfg.throttle)} % open, the manifold holds ${f2(ctx.cycle.Pman)} bar.
          That single number scales the entire cycle: torque follows the trapped mass almost linearly (see the P–V loop shrink).`
      };
    }
  },
  valvein: {
    name: 'Intake valve', tag: 'poppet, 36 mm head',
    spec: 'opens 12° BTDC-overlap · closes 40° ABDC · max lift 9.2 mm',
    body: `The intake valve lets the cylinder breathe. It opens BEFORE the piston reaches
      TDC (overlap, to use exhaust momentum) and stays open well after BDC (ram charge),
      closing at 220° — that late closing is why the effective compression ratio is lower
      than the geometric one.`,
    dyn(pt, ctx) {
      const open = pt.li > 0.15;
      const rows = [
        ['lift', f2(pt.li) + ' mm' + (open ? ' (' + f0(pt.li / M.VALVE.in.maxLift * 100) + ' % of max)' : ' — seated')],
        ['opens/closes', '708° → 220°'],
        ['seat state', open ? 'flowing' : 'closed, pressed by spring + gas']
      ];
      return {
        rows,
        say: open
          ? `Open ${f2(pt.li)} mm at ${f0(pt.th)}°. ${ctx.flows.in > 0.06 ? 'Charge is rushing past the seat around the valve head.' : 'Lift is small — flow is just getting started or tailing off.'}`
          : `Seated at ${f0(pt.th)}°. From 220° to 708° this valve seals the compression and power strokes; the spring and gas load hold it shut.`
      };
    }
  },
  valveex: {
    name: 'Exhaust valve', tag: 'poppet, 31 mm head, runs hot',
    spec: 'opens 45° BBDC · closes 8° ATDC-overlap · max lift 8.0 mm',
    body: `The exhaust valve opens 45° before BDC while the gas is still at several bar —
      sacrificing the last bit of expansion to blow down early. It closes just after TDC,
      overlapping the intake valve to help scavenging.`,
    dyn(pt, ctx) {
      const open = pt.le > 0.15;
      return {
        rows: [
          ['lift', f2(pt.le) + ' mm' + (open ? ' (' + f0(pt.le / M.VALVE.ex.maxLift * 100) + ' %)' : ' — seated')],
          ['opens/closes', '495° → 8°'],
          ['flow', dirWord(ctx.flows.ex, 'leaving', 'reversing')]
        ],
        say: open
          ? `Open ${f2(pt.le)} mm at ${f0(pt.th)}°, cylinder at ${f1(pt.P)} bar against ${f2(M.P_EXH)} bar back-pressure — the difference is what drives blow-down.`
          : `Seated at ${f0(pt.th)}°. It has the hottest job in the engine: brief contact with 800 °C gas, then it must seal a firing cylinder.`
      };
    }
  },
  springin: {
    name: 'Valve spring (intake)', tag: 'dual-rate coil',
    spec: 'must close the valve against 6500 rpm deceleration',
    body: `The spring's only job is to keep the follower in contact with the cam. If it is
      too weak (or broken), the valve floats: it stops tracking the cam, opens when it
      should be shut, and the engine loses all compression through it.`,
    dyn(pt, ctx) {
      if (ctx.faults.exhaustSpring || ctx.faults.intakeSpring) {
        const which = ctx.faults.intakeSpring && ctx.faults.exhaustSpring ? 'both'
          : ctx.faults.intakeSpring ? 'intake' : 'exhaust';
        return {
          rows: [
            ['state', 'BROKEN — valve floating'],
            ['affected side', which],
            ['chamber now', f1(pt.P) + ' bar (collapsed)']
          ],
          say: `A broken spring leaves its valve hanging partly open. With the ${which}
            valve${which === 'both' ? 's' : ''} stuck open, compression leaks away — see the pressure collapse on the P–θ
            chart and the port flow arrows running backwards.`
        };
      }
      return {
        rows: [
          ['compression', f2((M.VALVE.in.maxLift - pt.li)) + ' mm beyond free-installed'],
          ['seat force', 'spring + gas pressure hold the valve shut']
        ],
        say: `Compressing and returning the valve once per 720° — at ${f0(ctx.cfg.rpm)} rpm that is
          ${f0(ctx.cfg.rpm / 2)} cycles per minute, every one of them ending in a precise seat.`
      };
    }
  },
  springex: {
    name: 'Valve spring (exhaust)', tag: 'dual-rate coil',
    spec: 'same job, hotter environment',
    body: `Identical duty to the intake spring, in a hotter well: keep the follower on the
      cam through the whole lift and snap the valve back onto its seat at 8° ATDC.`,
    dyn(pt, ctx) {
      if (ctx.faults.exhaustSpring) {
        return {
          rows: [
            ['state', 'BROKEN — exhaust valve floating open'],
            ['chamber now', f1(pt.P) + ' bar'],
            ['peak this cycle', f1(ctx.cycle.peakP) + ' bar (stock ' + f1(ctx.base ? ctx.base.peakP : 0) + ')']
          ],
          say: `The exhaust valve no longer closes after its blow-down. From EVO all the
            way through the next compression stroke the cylinder is connected to the exhaust
            port — compression is gone, the spark cannot light a charge at ~1 bar, and the
            torque integral collapses. The engine would run (at best) on the other strokes' losses.`
        };
      }
      return {
        rows: [
          ['compression', f2(M.VALVE.ex.maxLift - pt.le) + ' mm'],
          ['seat event', '8° ATDC — just after overlap TDC']
        ],
        say: `Holding the exhaust valve closed through ${f0(ctx.cfg.rpm)} rpm of firing pressure.`
      };
    }
  },
  camin: {
    name: 'Cam lobe (intake)', tag: 'direct-acting bucket',
    spec: 'lift curve = this lobe silhouette · rotates at exactly ½ crank speed',
    body: `The lobe silhouette is the lift curve drawn in polar form: base circle plus the
      cam profile. It pushes the bucket follower down at exactly half crank speed —
      one valve event per two crank revolutions is the definition of a four-stroke.`,
    dyn(pt, ctx) {
      return {
        rows: [
          ['cam angle', f1((pt.th - M.VALVE.in.peak) / 2 % 360) + '°'],
          ['nose to follower', f2(pt.li) + ' mm of lift'],
          ['cam rpm', f0(ctx.cfg.rpm / 2)]
        ],
        say: `Spinning at half crank speed: the nose is currently delivering ${f2(pt.li)} mm
          of lift through the bucket. Watch it in slow motion — the flank, not the nose, does most of the accelerating.`
      };
    }
  },
  camex: {
    name: 'Camshaft (exhaust)', tag: 'driven by the same chain, 2:1',
    spec: 'phase set so the nose peaks at 611.5° crank',
    body: `The exhaust cam is phased so its nose points at the follower when the lift
      curve peaks at 611.5° — 45° BBDC would be too early to open, so the ramp starts
      there and the nose lands mid-curve.`,
    dyn(pt, ctx) {
      return {
        rows: [
          ['cam rpm', f0(ctx.cfg.rpm / 2) + ' (always half)'],
          ['exhaust lift now', f2(pt.le) + ' mm']
        ],
        say: `Chain-driven at exactly half crank speed. If the chain jumps a tooth, every
          valve event shifts — timing slip is one of the what-if faults for exactly that reason.`
      };
    }
  },
  plug: {
    name: 'Spark plug', tag: 'central, pent-roof anchored',
    spec: 'fires at 12° BTDC (adjustable) · ~20–40 kV arc',
    body: `The plug starts the burn slightly before TDC so that peak pressure lands just
      after the piston has started down. Too early and pressure fights the piston (and
      end-gas knocks); too late and the burn is still going during expansion.`,
    dyn(pt, ctx) {
      const sparkTh = 360 - ctx.cfg.advance;
      const near = pt.th >= sparkTh && pt.th <= sparkTh + 9;
      if (ctx.faults.spark) {
        return {
          rows: [
            ['spark', 'FAILED — no arc'],
            ['peak pressure', f1(ctx.cycle.peakP) + ' bar motored (stock ' + f1(ctx.base ? ctx.base.peakP : 0) + ')'],
            ['mean torque', f0(ctx.cycle.torqueMean) + ' N·m (negative: it costs work to turn)']
          ],
          say: `With no spark the engine only compresses and expands air: the pressure
            curve is a symmetric motoring hump peaking near ${f1(ctx.cycle.peakP)} bar at TDC,
            and the P–V loop collapses into a thin line — the work in equals the work out,
            minus losses. The crank must be driven from outside; the engine cannot sustain itself.`
        };
      }
      return {
        rows: [
          ['fires at', f0(sparkTh) + '° (' + f0(ctx.cfg.advance) + '° BTDC)'],
          ['state now', near ? 'ARCING' : (pt.th > sparkTh ? 'flame front travelling' : 'armed')],
          ['burned fraction', pt.phase === 2 ? f0(pt.xb * 100) + ' %' : '0 %']
        ],
        say: near
          ? `The plug is arcing now. Over the next ~40° the flame front — the growing glow — consumes the charge; half of it burns by ${f0(sparkTh + 21)}°.`
          : pt.xb > 0 && pt.xb < 1
            ? `Flame front expanding: ${f0(pt.xb * 100)} % of the charge burned so far.`
            : `Waiting. The coil charges during the compression stroke and dumps at ${f0(sparkTh)}°.`
      };
    }
  },
  chain: {
    name: 'Timing chain', tag: '2:1 reduction crank → cams',
    spec: 'crank sprocket 20 mm · cam sprockets 40 mm (2:1 by circumference)',
    body: `The chain ties the camshafts to the crank at exactly half speed and fixed
      phase. Every valve event exists only because this relation holds — jump a tooth
      and the whole valve timing slips.`,
    dyn(pt, ctx) {
      return {
        rows: [
          ['chain speed', f1(ctx.cfg.rpm * 0.084 * Math.PI) + ' m/s (est.)'],
          ['reduction', '2 : 1 — cams at ' + f0(ctx.cfg.rpm / 2) + ' rpm']
        ],
        say: `Marching dashes show chain travel. The crank sprocket turns twice for every
          cam sprocket turn — that is what makes two of the four strokes possible.`
      };
    }
  }
};
function side() { return 'intake side'; }

/* ------------ fault diagnosis cards (bench-driven) ------------ */
function diagnosis(faults, cycle, base) {
  const pk = f1(cycle.peakP) + ' bar', pk0 = base ? f1(base.peakP) + ' bar' : '—';
  const tm = f0(cycle.torqueMean) + ' N·m', tm0 = base ? f0(base.torqueMean) + ' N·m' : '—';
  if (faults.spark) return {
    title: 'Diagnosis — ignition failure',
    rows: [['peak pressure', pk + ' vs stock ' + pk0], ['mean indicated torque', tm + ' vs stock ' + tm0],
           ['P–V loop', 'collapsed to a line — work in ≈ work out']],
    say: `Nothing burns, so the cycle is pure motoring: the compressor work the piston
      puts in during compression comes back during expansion, minus heat loss and pumping.
      Mean torque goes slightly NEGATIVE — the engine needs to be cranked and can never sustain itself.`
  };
  if (faults.exhaustSpring) return {
    title: 'Diagnosis — exhaust valve stuck open',
    rows: [['peak pressure', pk + ' vs stock ' + pk0], ['compression', 'leaks to exhaust from EVO through IVC'],
           ['combustion', 'impossible — density at TDC is ~1 bar']],
    say: `A broken spring lets the exhaust valve hang open, so the cylinder is connected
      to the exhaust port during the whole compression stroke. There is nothing left to
      compress and nothing to burn: the pressure trace flatlines near back-pressure and
      the cycle produces only pumping losses.`
  };
  if (faults.intakeSpring) return {
    title: 'Diagnosis — intake valve stuck open',
    rows: [['peak pressure', pk + ' vs stock ' + pk0], ['compression', 'leaks back into the manifold'],
           ['extra effect', 'exhaust gas can flow out through the intake (backfire)']],
    say: `Same collapse as the exhaust-side failure, mirrored through the intake port:
      during compression the charge simply returns to the manifold. In a real engine this
      fault is loud — the leak pushes raw mixture back out of the throttle body.`
  };
  if (faults.rings) return {
    title: 'Diagnosis — worn rings / blow-by',
    rows: [['peak pressure', pk + ' vs stock ' + pk0], ['net work', f1(cycle.IMEPbar) + ' bar IMEP vs ' + (base ? f1(base.IMEPbar) : '—')],
           ['side effects', 'oil consumption, crankcase pressurisation']],
    say: `The gaps let charge escape continuously once the valves close: the compression
      line sags, peak pressure drops ~25 % and the burn starts from a weaker charge —
      torque falls more than pressure does, and oil is dragged up into the chamber.`
  };
  return null;
}

global.Parts = { PARTS, diagnosis };
})(typeof window !== 'undefined' ? window : globalThis);
