import { useEffect, useState } from "react";
import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import './SpaceLandingPage.css';

export default function SpaceLandingPage() {
  const totalGoal = 3500;
  const soundCovered = 500;

  const nodes = [
    { name: "FORM", raised: 600, goal: 1500 },
    { name: "ENERGY", raised: 250, goal: 800 },
    { name: "ATMOSPHERE", raised: 200, goal: 700 },
  ];

  const activeRaised = nodes.reduce((sum, item) => sum + item.raised, 0);
  const totalRaised = activeRaised + soundCovered;
  const totalPct = Math.min((totalRaised / totalGoal) * 100, 100);

  const currency = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content space-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#000000' }} />
          <h1 className="page-title">[SPACE.]</h1>
        </div>

        <div className="space-body">
          <div className="space-grid">
            <Timer />
            <SystemPanel
              totalRaised={totalRaised}
              totalGoal={totalGoal}
              totalPct={totalPct}
              currency={currency}
            />
          </div>

          <NodeSystem nodes={nodes} soundCovered={soundCovered} currency={currency} />

          <div className="space-actions">
            <button className="space-button">
              buy access
            </button>
            <button className="space-button">
              feed the horse
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function NodeSystem({ nodes, soundCovered, currency }) {
  return (
    <div className="space-nodes-container">
      <div className="space-nodes-status">
        <span className="space-pulse-dot" />
        sound online ({currency(soundCovered)})
      </div>

      <div className="space-nodes-grid">
        {nodes.map((n) => {
          const pct = Math.round((n.raised / n.goal) * 100);
          return (
            <div key={n.name} className="space-node-item">
              <p className="space-node-name">{n.name}</p>
              <div className="space-node-bar-bg">
                <div className="space-node-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="space-node-pct">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Timer() {
  const target = new Date("2026-07-03T20:00:00");
  const [time, setTime] = useState(getTimeLeft(target));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-timer-container">
      <p className="space-timer-label">countdown</p>
      <div className="space-timer-grid">
        <TimeUnit value={pad(time.days)} label="days" />
        <TimeUnit value={pad(time.hours)} label="hours" />
        <TimeUnit value={pad(time.minutes)} label="mins" />
        <TimeUnit value={pad(time.seconds)} label="secs" />
      </div>
    </div>
  );
}

function getTimeLeft(target) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
  const minutes = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));
  const seconds = Math.max(0, Math.floor((diff / 1000) % 60));

  return { days, hours, minutes, seconds };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function SystemPanel({ totalRaised, totalGoal, totalPct, currency }) {
  return (
    <div className="space-system-container">
      <p className="space-system-header">system</p>

      <div className="space-system-progress">
        <div className="space-system-amounts">
          <span>{currency(totalRaised)}</span>
          <span>{currency(totalGoal)}</span>
        </div>
        <div className="space-system-bar-bg">
          <div className="space-system-bar-fill" style={{ width: `${totalPct}%` }} />
        </div>
      </div>

      <div className="space-system-statuses">
        <Status label="sound" value="online" online />
        <Status label="form" value="building" />
        <Status label="energy" value="building" />
        <Status label="atmosphere" value="building" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }) {
  return (
    <div className="space-time-unit">
      <div className="space-time-value">{value}</div>
      <div className="space-time-label">{label}</div>
    </div>
  );
}

function Status({ label, value, online }) {
  return (
    <div className="space-status-item">
      <span className="space-status-label">{label}</span>
      <span className="space-status-value">
        {online && <span className="space-pulse-dot" />}
        {value}
      </span>
    </div>
  );
}
