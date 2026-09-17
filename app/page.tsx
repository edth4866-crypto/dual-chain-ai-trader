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

          <div
            style={{
              marginTop: 25,
              padding: 20,
              border: '1px solid #444',
              borderRadius: 10,
            }}
          >
            <h3>🐋 TOP 10 WHALES</h3>

            {result.topWhales?.length > 0 ? (
              <div>
                {result.topWhales.map(
                  (whale: any, index: number) => {
                    const actionColor =
                      whale.action === 'BUY'
                        ? '#16a34a'
                        : whale.action === 'SELL'
                        ? '#dc2626'
                        : '#888';

                    return (
                      <div
                        key={whale.walletAddress}
                        style={{
                          padding: '14px 0',
                          borderBottom:
                            index === result.topWhales.length - 1
                              ? 'none'
                              : '1px solid #333',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <strong>
                            #{index + 1}
                          </strong>

                          <span>
                            {whale.percentageOfSupply.toFixed(2)}%
                          </span>

                          <strong
                            style={{
                              color: actionColor,
                            }}
                          >
                            {whale.action}
                          </strong>
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            opacity: 0.75,
                          }}
                        >
                          {whale.walletAddress}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                          }}
                        >
                          Net Flow:{' '}
                          {whale.netAmount.toLocaleString()}
                          {' · '}
                          Transactions:{' '}
                          {whale.transactionCount}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <p>
                No whale data available.
              </p>
            )}
          </div>

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