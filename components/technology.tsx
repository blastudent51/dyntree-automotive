'use client';
import { useState } from 'react';
import {
  Navigation,
  Music2,
  Thermometer,
  Zap,
  CarFront,
  Phone,
  Home,
  Play,
  Pause,
  SkipForward,
  Wifi,
  Signal,
  LockKeyhole,
  Check,
  Smartphone,
  Minus,
  Plus,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
const screens = [
  ['home', 'Home', Home],
  ['navigation', 'Navigation', Navigation],
  ['media', 'Media', Music2],
  ['climate', 'Climate', Thermometer],
  ['charging', 'Charging', Zap],
  ['drive', 'Drive', CarFront],
  ['performance', 'Performance', Gauge],
  ['carplay', 'CarPlay', Phone],
  ['cluster', 'Cluster', Gauge],
] as const;
export function LiviDemo({ compact = false }: { compact?: boolean }) {
  const [screen, setScreen] = useState('home');
  const [playing, setPlaying] = useState(false);
  const [temp, setTemp] = useState(70);
  return (
    <div className={`livi-demo ${compact ? 'livi-compact' : ''}`}>
      <div className="livi-top">
        <strong>
          LIVI <span>for Dyntree</span>
        </strong>
        <div>
          <span>10:24</span>
          <Signal size={14} />
          <Wifi size={14} />
          <span>72°</span>
        </div>
      </div>
      <div className="livi-body">
        <nav aria-label="Infotainment prototype screens">
          {screens.slice(0, 7).map(([id, label, Icon]) => (
            <button
              key={id}
              className={id === screen ? 'active' : ''}
              aria-label={label}
              aria-pressed={id === screen}
              onClick={() => setScreen(id)}
            >
              <Icon size={19} />
            </button>
          ))}
        </nav>
        <div className="livi-screen">
          <div className="livi-heading">
            <span>{screens.find((x) => x[0] === screen)?.[1]}</span>
            <small>INTERACTIVE DESIGN CONCEPT</small>
          </div>
          {screen === 'home' || screen === 'navigation' ? (
            <div className="livi-home">
              <div className="map-mock">
                <svg viewBox="0 0 500 310" aria-label="Illustrative navigation map">
                  <defs>
                    <pattern id="grid" width="55" height="55" patternUnits="userSpaceOnUse">
                      <path d="M55 0H0V55" fill="none" stroke="#273037" strokeWidth="3" />
                    </pattern>
                  </defs>
                  <rect width="500" height="310" fill="url(#grid)" />
                  <path
                    d="M0 270L170 140L250 140L370 40L500 40"
                    fill="none"
                    stroke="#3f515e"
                    strokeWidth="22"
                  />
                  <path
                    d="M120 310L120 190L250 190L250 65L430 65"
                    fill="none"
                    stroke="#a6ebeb"
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />
                  <circle cx="250" cy="190" r="9" fill="#ddffff" />
                  <text x="315" y="245" fill="#8c9ca5" fontSize="13">
                    RIVER DISTRICT
                  </text>
                  <text x="55" y="70" fill="#8c9ca5" fontSize="13">
                    NORTH PARK
                  </text>
                </svg>
                <div className="map-direction">
                  <Navigation size={18} />
                  <span>
                    Continue along River Road<small>2.4 miles · Concept route</small>
                  </span>
                </div>
              </div>
              <div className="livi-tiles">
                <div>
                  <span>READY WHEN YOU ARE</span>
                  <strong>Good morning.</strong>
                  <p>Where shall we go?</p>
                  <button onClick={() => setScreen('navigation')}>
                    Choose destination <Navigation size={14} />
                  </button>
                </div>
                <div className="mini-media">
                  <Music2 size={20} />
                  <span>
                    Open roads<small>Dyntree Sessions · UI concept</small>
                  </span>
                  <button
                    aria-label={playing ? 'Pause media concept' : 'Play media concept'}
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <Pause size={17} /> : <Play size={17} />}
                  </button>
                </div>
              </div>
            </div>
          ) : screen === 'media' ? (
            <div className="media-screen">
              <div className="album-art">
                <Music2 size={50} />
              </div>
              <p>DYNTREE SESSIONS</p>
              <h3>Open roads</h3>
              <span>Ambient drive · Visual prototype, no audio</span>
              <div>
                <Button
                  size="icon"
                  onClick={() => setPlaying(!playing)}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause /> : <Play />}
                </Button>
                <SkipForward size={20} />
              </div>
            </div>
          ) : screen === 'climate' ? (
            <div className="climate-screen">
              <Thermometer size={32} />
              <p>Cabin temperature</p>
              <div>
                <Button
                  aria-label="Lower temperature"
                  size="icon"
                  variant="outline"
                  onClick={() => setTemp(Math.max(60, temp - 1))}
                >
                  <Minus />
                </Button>
                <strong>{temp}°</strong>
                <Button
                  aria-label="Raise temperature"
                  size="icon"
                  variant="outline"
                  onClick={() => setTemp(Math.min(85, temp + 1))}
                >
                  <Plus />
                </Button>
              </div>
              <span>Dual-zone · AUTO · Concept controls</span>
            </div>
          ) : screen === 'charging' ? (
            <div className="charging-screen">
              <Zap size={27} />
              <p>Charging concept</p>
              <strong>
                68<span>%</span>
              </strong>
              <div className="battery-track">
                <span style={{ width: '68%' }} />
              </div>
              <div>
                <span>
                  144 kW<small>Illustrative power</small>
                </span>
                <span>
                  12 min<small>Illustrative to 80%</small>
                </span>
                <span>
                  170 mi<small>Estimated display</small>
                </span>
              </div>
            </div>
          ) : screen === 'drive' ? (
            <div className="drive-screen">
              <div className="lane-viz">
                <span />
                <span />
                <CarFront size={65} />
                <div className="detected-car">
                  <CarFront size={26} />
                </div>
              </div>
              <p>Driver supervision required</p>
              <small>Visualization concept only · Not a driving system</small>
            </div>
          ) : screen === 'performance' || screen === 'cluster' ? (
            <div className="cluster-screen">
              <div>
                <span>{screen === 'performance' ? 'POWER TARGET' : 'PARKED'}</span>
                <strong>
                  {screen === 'performance' ? '400' : '0'}
                  <small>{screen === 'performance' ? 'hp' : 'mph'}</small>
                </strong>
                <p>
                  {screen === 'performance'
                    ? 'Multiply · Estimated peak output'
                    : '68% battery · Prototype instrument cluster'}
                </p>
              </div>
              <div className="cluster-bars">
                {Array.from({ length: 20 }, (_, i) => (
                  <span key={i} style={{ height: 14 + i * 3, opacity: i < 15 ? 1 : 0.2 }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="carplay-screen">
              <Smartphone size={35} />
              <h3>Your phone, connected.</h3>
              <p>CarPlay & Android Auto integration targets</p>
              <small>Projection placeholder. Third-party interface not reproduced.</small>
            </div>
          )}
        </div>
      </div>
      <div className="livi-bottom">
        <span>
          <Thermometer size={15} />
          {temp}° <small>AUTO</small>
        </span>
        <span>DYNTREE M1E</span>
        <span>
          <Zap size={15} />
          68%
        </span>
      </div>
      {!compact && (
        <Tabs value={screen} onValueChange={setScreen} className="livi-mode-tabs">
          <TabsList>
            {screens.map(([id, label]) => (
              <TabsTrigger key={id} value={id}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
export function PhoneKeyDemo() {
  const states = ['Phone detected', 'Vehicle unlocked', 'Profile loaded', 'Vehicle ready'];
  const [step, setStep] = useState(0);
  return (
    <div className="phone-key">
      <div>
        <Smartphone size={23} />
        <strong>
          Dyntree Key <small>Concept preview</small>
        </strong>
      </div>
      <ol>
        {states.map((s, i) => (
          <li key={s} className={i <= step ? 'complete' : ''}>
            {i <= step ? <Check size={15} /> : <span className="key-dot" />}
            {s}
          </li>
        ))}
      </ol>
      <Button variant="outline" onClick={() => setStep((step + 1) % 4)}>
        {step === 3 ? 'Restart preview' : 'Preview next step'} <LockKeyhole size={15} />
      </Button>
      <p>
        BLE + UWB + NFC backup
        <br />
        Two NFC backup key cards included in vehicle plan.
      </p>
    </div>
  );
}
export function SensorDiagram() {
  const [active, setActive] = useState('camera');
  const kinds = [
    ['camera', '8 exterior cameras', '#a9eeee'],
    ['radar', '5 radar sensors', '#b8abd9'],
    ['ultrasonic', '12 ultrasonic sensors', '#d8ae86'],
    ['driver', 'Infrared driver monitoring', '#c4d2de'],
  ] as const;
  const points: Record<string, number[][]> = {
    camera: [
      [150, 40],
      [85, 105],
      [215, 105],
      [75, 170],
      [225, 170],
      [85, 280],
      [215, 280],
      [150, 330],
    ],
    radar: [
      [150, 30],
      [75, 90],
      [225, 90],
      [75, 310],
      [225, 310],
    ],
    ultrasonic: [
      [95, 42],
      [120, 32],
      [180, 32],
      [205, 42],
      [68, 95],
      [232, 95],
      [68, 290],
      [232, 290],
      [95, 327],
      [120, 337],
      [180, 337],
      [205, 327],
    ],
    driver: [[130, 135]],
  };
  return (
    <div className="sensor-diagram">
      <svg
        viewBox="0 0 300 370"
        role="img"
        aria-label={`Concept placement: ${kinds.find((x) => x[0] === active)?.[1]}`}
      >
        <rect
          x="62"
          y="20"
          width="176"
          height="328"
          rx="72"
          fill="#161e23"
          stroke="#46545d"
          strokeWidth="2"
        />
        <path d="M92 122Q150 85 208 122L205 250Q150 272 95 250Z" fill="#202e35" stroke="#637078" />
        <path d="M95 178H205M150 270V327M86 82Q150 52 214 82" fill="none" stroke="#536269" />
        {points[active].map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="15"
              fill={kinds.find((k) => k[0] === active)![2]}
              opacity=".12"
            />
            <circle cx={x} cy={y} r="4.5" fill={kinds.find((k) => k[0] === active)![2]} />
          </g>
        ))}
      </svg>
      <div>
        <p className="eyebrow">AWARENESS, IN EVERY DIRECTION</p>
        <h3>A connected sensor concept.</h3>
        {kinds.map(([id, label, color]) => (
          <button
            key={id}
            aria-pressed={active === id}
            className={active === id ? 'active' : ''}
            onClick={() => setActive(id)}
          >
            <span style={{ background: color }} />
            {label}
          </button>
        ))}
        <p>
          Positioning supported by GNSS, an IMU and wheel-speed sensors. Counts and locations are
          engineering concepts and may change.
        </p>
      </div>
    </div>
  );
}
