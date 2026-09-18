'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [chain, setChain] = useState('solana');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  const [account, setAccount] = useState<any>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  async function loadAccount() {
    setAccountLoading(true);

    try {
      const response = await fetch('/api/paper/account', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (data.success) {
        setAccount(data.account);
      }
    } catch (error) {
      console.error('Failed to load paper account:', error);
    } finally {
      setAccountLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();

    const interval = setInterval(() => {
      loadAccount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function runScan() {
    setLoading(true);
    setSelected(null);

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

      if (data.candidates?.length > 0) {
        setSelected(data.candidates[0]);
      }

      await loadAccount();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function actionColor(action: string) {
    if (action === 'VETO') return '#dc2626';
    if (action === 'BUY') return '#16a34a';
    if (action === 'SELL') return '#ea580c';
    return '#eab308';
  }

  function statusColor(status: string) {
    if (status === 'VETO') return '#dc2626';
    if (status === 'PASS') return '#16a34a';
    return '#eab308';
  }

  const positions = account?.positions ?? [];
  const trades = account?.trades ?? [];

  const totalPnl = trades.reduce(
    (sum: number, trade: any) =>
      sum + Number(trade.pnlUsd || 0),
    0
  );

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '25px 16px 50px',
        fontFamily: 'Arial, sans-serif',
        color: '#111',
      }}
    >
      {/* PAPER TRADING DASHBOARD */}

      <section
        style={{
          background: '#111',
          color: '#fff',
          borderRadius: 18,
          padding: 20,
          marginBottom: 30,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 15,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                opacity: 0.6,
              }}
            >
              AI MEMECOIN TRADER
            </div>

            <h2
              style={{
                margin: '5px 0',
                fontSize: 25,
              }}
            >
              Paper Trading Dashboard
            </h2>
          </div>

          <div
            style={{
              background: '#16a34a',
              padding: '7px 12px',
              borderRadius: 20,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            🟢 PAPER MODE
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginTop: 20,
          }}
        >
          <DashboardMetric
            label="Balance"
            value={
              account
                ? `$${Number(
                    account.balanceUsd || 0
                  ).toFixed(2)}`
                : 'Loading...'
            }
          />

          <DashboardMetric
            label="Open Positions"
            value={String(positions.length)}
          />

          <DashboardMetric
            label="Closed Trades"
            value={String(trades.length)}
          />

          <DashboardMetric
            label="Total P&L"
            value={`$${totalPnl.toFixed(2)}`}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 18,
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 12,
              opacity: 0.55,
            }}
          >
            {accountLoading
              ? 'Updating...'
              : 'Auto refresh: 30 seconds'}
          </span>

          <button
            onClick={loadAccount}
            style={{
              padding: '8px 13px',
              borderRadius: 8,
              border: '1px solid #555',
              background: '#222',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {positions.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3
              style={{
                marginBottom: 10,
              }}
            >
              📈 Open Positions
            </h3>

            {positions.map(
              (position: any, index: number) => (
                <div
                  key={`${position.token}-${position.openedAt}-${index}`}
                  style={{
                    background: '#1d1d1d',
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                    }}
                  >
                    <strong>
                      {position.symbol}
                    </strong>

                    <span
                      style={{
                        color: '#22c55e',
                        fontWeight: 700,
                      }}
                    >
                      PAPER BUY
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      opacity: 0.7,
                    }}
                  >
                    Entry: $
                    {Number(
                      position.entryPrice || 0
                    ).toFixed(4)}
                    {' · '}
                    Invested: $
                    {Number(
                      position.investedUsd || 0
                    ).toFixed(2)}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <h1 style={{ marginBottom: 8 }}>
        Multi-Chain AI Trader
      </h1>

      <p style={{ opacity: 0.7 }}>
        Solana + BNB Chain + Robinhood Chain · 10-Agent Handoff · Paper Trading
      </p>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 25,
          flexWrap: 'wrap',
        }}
      >
        {['solana', 'bsc', 'robinhood'].map((item) => (
          <button
            key={item}
            onClick={() => setChain(item)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #ccc',
              background:
                chain === item ? '#111' : '#fff',
              color:
                chain === item ? '#fff' : '#111',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {item === 'solana'
              ? 'Solana'
              : item === 'bsc'
              ? 'BNB Chain'
              : 'Robinhood Chain'}
          </button>
        ))}
      </div>

      <p style={{ marginTop: 18 }}>
        Selected Chain:{' '}
        <strong>{chain}</strong>
      </p>

      <button
        onClick={runScan}
        disabled={loading}
        style={{
          marginTop: 5,
          padding: '13px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#111',
          color: '#fff',
          cursor: loading ? 'wait' : 'pointer',
          fontWeight: 700,
        }}
      >
        {loading ? 'Analyzing...' : 'Run AI Scan'}
      </button>

      {result?.candidates?.length > 0 && (
        <section style={{ marginTop: 35 }}>
          <h2>
            🔎 Top Candidates
          </h2>

          <p style={{ opacity: 0.65 }}>
            {result.totalCandidates} candidates analyzed
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 15,
              marginTop: 20,
            }}
          >
            {result.candidates.map(
              (candidate: any) => (
                <button
                  key={candidate.address}
                  onClick={() =>
                    setSelected(candidate)
                  }
                  style={{
                    textAlign: 'left',
                    padding: 18,
                    borderRadius: 12,
                    border:
                      selected?.address ===
                      candidate.address
                        ? '2px solid #111'
                        : '1px solid #ddd',
                    background: '#fff',
                    cursor: 'pointer',
                    boxShadow:
                      '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 18,
                      }}
                    >
                      #{candidate.finalRank}{' '}
                      {candidate.symbol}
                    </strong>

                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 20,
                      }}
                    >
                      {candidate.score}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: actionColor(
                        candidate.action
                      ),
                      fontWeight: 800,
                    }}
                  >
                    {candidate.action}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      lineHeight: 1.7,
                      opacity: 0.75,
                    }}
                  >
                    Liquidity: $
                    {Number(
                      candidate.market
                        ?.liquidityUsd || 0
                    ).toLocaleString()}

                    <br />

                    Volume 1h: $
                    {Number(
                      candidate.market
                        ?.volume1hUsd || 0
                    ).toLocaleString()}

                    <br />

                    Top 10 Holders:{' '}
                    {Number(
                      candidate.security
                        ?.top10HolderPct || 0
                    ).toFixed(1)}
                    %

                    <br />

                    Whale:{' '}
                    {Number(
                      candidate.whale
                        ?.percentageOfSupply || 0
                    ).toFixed(1)}
                    %
                  </div>
                </button>
              )
            )}
          </div>
        </section>
      )}

      {selected && (
        <section
          style={{
            marginTop: 35,
            padding: 25,
            borderRadius: 14,
            border: '1px solid #ddd',
            background: '#fafafa',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ marginBottom: 5 }}>
                {selected.name} (
                {selected.symbol})
              </h2>

              <div
                style={{
                  fontSize: 13,
                  opacity: 0.6,
                  wordBreak: 'break-all',
                }}
              >
                {selected.address}
              </div>
            </div>

            <div
              style={{
                textAlign: 'right',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                }}
              >
                {selected.score}/100
              </div>

              <div
                style={{
                  color: actionColor(
                    selected.action
                  ),
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                {selected.action}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginTop: 25,
            }}
          >
            <Metric
              label="Liquidity"
              value={`$${Number(
                selected.market?.liquidityUsd || 0
              ).toLocaleString()}`}
            />

            <Metric
              label="Volume 1h"
              value={`$${Number(
                selected.market?.volume1hUsd || 0
              ).toLocaleString()}`}
            />

            <Metric
              label="Top 10 Holders"
              value={`${Number(
                selected.security?.top10HolderPct || 0
              ).toFixed(2)}%`}
            />

            <Metric
              label="Whale"
              value={`${Number(
                selected.whale?.percentageOfSupply || 0
              ).toFixed(2)}%`}
            />

            <Metric
              label="5m Change"
              value={`${Number(
                selected.market?.priceChange5mPct || 0
              ).toFixed(2)}%`}
            />

            <Metric
              label="1h Change"
              value={`${Number(
                selected.market?.priceChange1hPct || 0
              ).toFixed(2)}%`}
            />
          </div>

          <h3 style={{ marginTop: 30 }}>
            🤖 Agent Handoff
          </h3>

          <div>
            {selected.agents?.map(
              (agent: any, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: '12px 0',
                    borderBottom:
                      '1px solid #ddd',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                    }}
                  >
                    <strong>
                      {agent.name}
                    </strong>

                    <span
                      style={{
                        color: statusColor(
                          agent.status
                        ),
                        fontWeight: 800,
                      }}
                    >
                      {agent.status}{' '}
                      {agent.score}/100
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      opacity: 0.7,
                    }}
                  >
                    {agent.note}
                  </div>
                </div>
              )
            )}
          </div>

          <h3 style={{ marginTop: 30 }}>
            🐋 Top Whales
          </h3>

          {selected.topWhales?.length > 0 ? (
            selected.topWhales.map(
              (whale: any, index: number) => (
                <div
                  key={whale.walletAddress}
                  style={{
                    padding: '12px 0',
                    borderBottom:
                      '1px solid #ddd',
                  }}
                >
                  <strong>
                    #{index + 1}
                  </strong>{' '}
                  {whale.percentageOfSupply.toFixed(
                    2
                  )}
                  %{' '}
                  <strong
                    style={{
                      color: actionColor(
                        whale.action
                      ),
                    }}
                  >
                    {whale.action}
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      fontFamily:
                        'monospace',
                      opacity: 0.65,
                      wordBreak:
                        'break-all',
                    }}
                  >
                    {whale.walletAddress}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                    }}
                  >
                    Net Flow:{' '}
                    {Number(
                      whale.netAmount || 0
                    ).toLocaleString()}{' '}
                    · Transactions:{' '}
                    {whale.transactionCount}
                  </div>
                </div>
              )
            )
          ) : (
            <p>
              No whale data available.
            </p>
          )}

          <h3 style={{ marginTop: 30 }}>
            🛡️ Risk & Security
          </h3>

          <p>
            Mint Authority:{' '}
            <strong>
              {selected.security
                ?.mintAuthority
                ? 'ACTIVE'
                : 'DISABLED'}
            </strong>
          </p>

          <p>
            Freeze Authority:{' '}
            <strong>
              {selected.security
                ?.freezeAuthority
                ? 'ACTIVE'
                : 'DISABLED'}
            </strong>
          </p>

          <p>
            Boost:{' '}
            <strong>
              {selected.boost?.active
                ? `ACTIVE (${selected.boost.amount})`
                : 'NONE'}
            </strong>
          </p>

          <h3 style={{ marginTop: 30 }}>
            📋 Decision Reasons
          </h3>

          <ul>
            {selected.reasons?.map(
              (
                reason: string,
                index: number
              ) => (
                <li key={index}>
                  {reason}
                </li>
              )
            )}
          </ul>
        </section>
      )}
    </main>
  );
}

function DashboardMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: '#1d1d1d',
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.55,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 21,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 15,
        borderRadius: 10,
        background: '#fff',
        border: '1px solid #ddd',
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 17,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}