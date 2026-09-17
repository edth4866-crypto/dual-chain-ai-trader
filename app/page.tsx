'use client';

import { useState } from 'react';

export default function Home() {
  const [chain, setChain] = useState('solana');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function runScan() {
    setLoading(true);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chain }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>Multi-Chain AI Trader</h1>

      <p>
        Solana + BNB Chain + Robinhood Chain · 10-Agent Handoff · Paper Trading
      </p>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 25,
        }}
      >
        <button onClick={() => setChain('solana')}>
          Solana
        </button>

        <button onClick={() => setChain('bsc')}>
          BNB Chain
        </button>

        <button onClick={() => setChain('robinhood')}>
          Robinhood Chain
        </button>
      </div>

      <p style={{ marginTop: 20 }}>
        Selected Chain: <strong>{chain}</strong>
      </p>

      <button
        onClick={runScan}
        disabled={loading}
        style={{
          marginTop: 10,
          padding: '12px 20px',
          cursor: 'pointer',
        }}
      >
        {loading ? 'Analyzing...' : 'Run AI Scan'}
      </button>

      {result && (
        <section style={{ marginTop: 30 }}>
          <h2>{result.token}</h2>

          <p>
            Chain: {result.chain}
          </p>

          <p>
            Score: {result.score}/100
          </p>

          <p>
            Action: {result.action}
          </p>

          <p>
            Confidence: {(result.confidence * 100).toFixed(0)}%
          </p>

          <h3>Reasons</h3>

          <ul>
            {result.reasons?.map((reason: string, index: number) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>

          <h3>Agent Handoff</h3>

          {result.agents?.map((agent: any, index: number) => (
            <div
              key={index}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid #333',
              }}
            >
              <strong>{agent.name}</strong>
              {' — '}
              {agent.status}
              {' — '}
              {agent.score}/100

              <div>{agent.note}</div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}