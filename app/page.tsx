'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [chain, setChain] = useState('solana');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  const [account, setAccount] = useState<any>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const [training, setTraining] = useState<any>(null);
  const [trainingLoading, setTrainingLoading] = useState(false);

  const [language, setLanguage] =
    useState<'en' | 'ko'>('en');

  const text = {
    en: {
      paperDashboard: 'Paper Trading Dashboard',
      paperMode: '🟢 PAPER MODE',
      balance: 'Balance',
      openPositions: 'Open Positions',
      closedTrades: 'Closed Trades',
      totalPnl: 'Total P&L',
      updating: 'Updating...',
      autoRefresh: 'Auto refresh: 30 seconds',
      refresh: '🔄 Refresh',
      openPositionsTitle: '📈 Open Positions',
      paperBuy: 'PAPER BUY',
      entry: 'Entry',
      invested: 'Invested',
      current: 'Current',
      value: 'Value',
      unrealizedPnl: 'Unrealized P&L',
      closePosition: 'CLOSE POSITION',

      aiTraining: '🧠 AI Training Dashboard',
      trainingData: 'Training Data',
      totalTrades: 'Total Trades',
      wins: 'Wins',
      losses: 'Losses',
      neutral: 'Neutral',
      winRate: 'Win Rate',
      averagePnl: 'Average P&L',
      trainingPnl: 'Training P&L',
      aiDecisionResults: '🤖 AI Decision Results',
      recentTraining: '📚 Recent Training Data',
      samples: 'samples',
      noTrainingData: 'No training data available.',
      trainingUpdating: 'Updating AI training data...',
      trainingAutoRefresh:
        'Training data auto-refresh: 30 seconds',

      modelStatus: 'AI Model Status',
      dataCollection: 'DATA COLLECTION',
      modelNotice:
        'Paper trading results are being collected. The current dataset is still too small for statistically reliable AI model training.',
      linkedDecisions: 'Linked AI Decisions',
      unlinkedTrades: 'Unlinked Trades',

      multiChain: 'Multi-Chain AI Trader',
      description:
        'Solana + BNB Chain + Robinhood Chain · 10-Agent Handoff · Paper Trading',
      selectedChain: 'Selected Chain',
      analyzing: 'Analyzing...',
      runScan: 'Run AI Scan',

      topCandidates: '🔎 Top Candidates',
      candidatesAnalyzed: 'candidates analyzed',

      liquidity: 'Liquidity',
      volume1h: 'Volume 1h',
      top10: 'Top 10 Holders',
      whale: 'Whale',
      fiveMin: '5m Change',
      oneHour: '1h Change',

      agentHandoff: '🤖 Agent Handoff',
      topWhales: '🐋 Top Whales',
      riskSecurity: '🛡️ Risk & Security',
      mintAuthority: 'Mint Authority',
      freezeAuthority: 'Freeze Authority',
      boost: 'Boost',
      decisionReasons: '📋 Decision Reasons',

      noWhaleData: 'No whale data available.',
      active: 'ACTIVE',
      disabled: 'DISABLED',
      none: 'NONE',

      languageButton: '한국어',

      closeConfirm:
        'Close this position at the current price?',
      closeSuccess: 'closed successfully.',
      closeFailed: 'Failed to close position.',
      paperBuyLabel: 'PAPER BUY',
    },

    ko: {
      paperDashboard: '모의거래 대시보드',
      paperMode: '🟢 모의거래 모드',
      balance: '잔액',
      openPositions: '보유 포지션',
      closedTrades: '종료 거래',
      totalPnl: '총 손익',
      updating: '업데이트 중...',
      autoRefresh: '자동 새로고침: 30초',
      refresh: '🔄 새로고침',
      openPositionsTitle: '📈 보유 포지션',
      paperBuy: '모의 매수',
      entry: '진입가',
      invested: '투자금',
      current: '현재가',
      value: '현재 가치',
      unrealizedPnl: '미실현 손익',
      closePosition: '포지션 종료',

      aiTraining: '🧠 AI 학습 대시보드',
      trainingData: '학습 데이터',
      totalTrades: '전체 거래',
      wins: '승리',
      losses: '손실',
      neutral: '중립',
      winRate: '승률',
      averagePnl: '평균 손익',
      trainingPnl: '학습 데이터 손익',
      aiDecisionResults: '🤖 AI 판단 결과',
      recentTraining: '📚 최근 학습 데이터',
      samples: '개 샘플',
      noTrainingData: '학습 데이터가 없습니다.',
      trainingUpdating: 'AI 학습 데이터 업데이트 중...',
      trainingAutoRefresh:
        '학습 데이터 자동 새로고침: 30초',

      modelStatus: 'AI 모델 상태',
      dataCollection: '데이터 수집 중',
      modelNotice:
        '현재 모의거래 결과를 계속 수집하고 있습니다. 현재 데이터는 실제 AI 모델 학습에 사용하기에는 아직 통계적으로 충분하지 않습니다.',
      linkedDecisions: '연결된 AI 판단',
      unlinkedTrades: '미연결 거래',

      multiChain: '멀티체인 AI 트레이더',
      description:
        'Solana + BNB Chain + Robinhood Chain · 10개 에이전트 분석 · 모의거래',
      selectedChain: '선택된 체인',
      analyzing: '분석 중...',
      runScan: 'AI 스캔 실행',

      topCandidates: '🔎 주요 후보',
      candidatesAnalyzed: '개 후보 분석 완료',

      liquidity: '유동성',
      volume1h: '1시간 거래량',
      top10: '상위 10개 홀더',
      whale: '고래',
      fiveMin: '5분 변동',
      oneHour: '1시간 변동',

      agentHandoff: '🤖 에이전트 분석',
      topWhales: '🐋 주요 고래',
      riskSecurity: '🛡️ 위험 및 보안',
      mintAuthority: '민트 권한',
      freezeAuthority: '동결 권한',
      boost: '부스트',
      decisionReasons: '📋 판단 근거',

      noWhaleData: '고래 데이터가 없습니다.',
      active: '활성',
      disabled: '비활성',
      none: '없음',

      languageButton: 'English',

      closeConfirm:
        '현재 가격으로 이 포지션을 종료할까요?',
      closeSuccess: '포지션이 성공적으로 종료되었습니다.',
      closeFailed: '포지션 종료에 실패했습니다.',
      paperBuyLabel: '모의 매수',
    },
  };

  const t = text[language];

  async function loadAccount() {
    setAccountLoading(true);

    try {
      const response = await fetch(
        '/api/paper/account',
        {
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (data.success) {
        setAccount(data.account);
      }
    } catch (error) {
      console.error(
        'Failed to load paper account:',
        error
      );
    } finally {
      setAccountLoading(false);
    }
  }

  async function loadTraining() {
    setTrainingLoading(true);

    try {
      const response = await fetch(
        '/api/ai/training',
        {
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (data.success) {
        setTraining(data);
      }
    } catch (error) {
      console.error(
        'Failed to load AI training data:',
        error
      );
    } finally {
      setTrainingLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
    loadTraining();

    const interval = setInterval(() => {
      loadAccount();
      loadTraining();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function runScan() {
    setLoading(true);
    setSelected(null);

    try {
      const response = await fetch(
        '/api/scan',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({ chain }),
        }
      );

      const data = await response.json();

      setResult(data);

      if (data.candidates?.length > 0) {
        setSelected(data.candidates[0]);
      }

      await loadAccount();
      await loadTraining();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function closePaperPosition(
    position: any
  ) {
    const confirmed = window.confirm(
      `${position.symbol} ${t.closeConfirm}`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        '/api/paper/close',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            token: position.token,
            openedAt: position.openedAt,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        window.alert(
          data.message ||
            data.error ||
            t.closeFailed
        );
        return;
      }

      if (language === 'ko') {
        window.alert(
          `${position.symbol} ${t.closeSuccess} 손익: $${Number(
            data.trade?.pnlUsd || 0
          ).toFixed(2)}`
        );
      } else {
        window.alert(
          `${position.symbol} ${t.closeSuccess} P&L: $${Number(
            data.trade?.pnlUsd || 0
          ).toFixed(2)}`
        );
      }

      await loadAccount();
      await loadTraining();
    } catch (error) {
      console.error(
        'Failed to close paper position:',
        error
      );

      window.alert(t.closeFailed);
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

  const positions =
    account?.positions ?? [];

  const trades =
    account?.trades ?? [];

  const totalPnl =
    trades.reduce(
      (
        sum: number,
        trade: any
      ) =>
        sum +
        Number(
          trade.pnlUsd || 0
        ),
      0
    );

  const trainingStats =
    training?.stats ?? {
      total: 0,
      wins: 0,
      losses: 0,
      neutral: 0,
      winRate: 0,
      totalPnl: 0,
      averagePnlPct: 0,
      linkedDecisions: 0,
      unlinkedTrades: 0,
    };

  const trainingRows =
    training?.rows ?? [];

  const linkedDecisions =
    Number(
      trainingStats.linkedDecisions || 0
    );

  const unlinkedTrades =
    Number(
      trainingStats.unlinkedTrades || 0
    );

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '25px 16px 50px',
        fontFamily:
          'Arial, sans-serif',
        color: '#111',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'flex-end',
          marginBottom: 12,
        }}
      >
        <button
          onClick={() =>
            setLanguage(
              language === 'en'
                ? 'ko'
                : 'en'
            )
          }
          style={{
            padding:
              '8px 14px',
            borderRadius: 20,
            border:
              '1px solid #ddd',
            background: '#fff',
            color: '#111',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          🌐 {t.languageButton}
        </button>
      </div>

      <section
        style={{
          background: '#111',
          color: '#fff',
          borderRadius: 18,
          padding: 20,
          marginBottom: 30,
          boxShadow:
            '0 8px 30px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
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
                margin:
                  '5px 0',
                fontSize: 25,
              }}
            >
              {t.paperDashboard}
            </h2>
          </div>

          <div
            style={{
              background:
                '#16a34a',
              padding:
                '7px 12px',
              borderRadius: 20,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {t.paperMode}
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
            label={t.balance}
            value={
              account
                ? `$${Number(
                    account.balanceUsd ||
                      0
                  ).toFixed(2)}`
                : 'Loading...'
            }
          />

          <DashboardMetric
            label={
              t.openPositions
            }
            value={String(
              positions.length
            )}
          />

          <DashboardMetric
            label={
              t.closedTrades
            }
            value={String(
              trades.length
            )}
          />

          <DashboardMetric
            label={t.totalPnl}
            value={`$${totalPnl.toFixed(
              2
            )}`}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
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
              ? t.updating
              : t.autoRefresh}
          </span>

          <button
            onClick={loadAccount}
            style={{
              padding:
                '8px 13px',
              borderRadius: 8,
              border:
                '1px solid #555',
              background: '#222',
              color: '#fff',
              cursor:
                'pointer',
            }}
          >
            {t.refresh}
          </button>
        </div>

        {positions.length >
          0 && (
          <div
            style={{
              marginTop: 20,
            }}
          >
            <h3
              style={{
                marginBottom: 10,
              }}
            >
              {t.openPositionsTitle}
            </h3>

            {positions.map(
              (
                position: any,
                index: number
              ) => (
                <div
                  key={`${position.token}-${position.openedAt}-${index}`}
                  style={{
                    background:
                      '#1d1d1d',
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                    }}
                  >
                    <strong>
                      {
                        position.symbol
                      }
                    </strong>

                    <span
                      style={{
                        color:
                          '#22c55e',
                        fontWeight:
                          700,
                      }}
                    >
                      {
                        t.paperBuy
                      }
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      opacity: 0.7,
                    }}
                  >
                    {t.entry}: $
                    {Number(
                      position.entryPrice ||
                        0
                    ).toFixed(4)}
                    {' · '}
                    {t.invested}: $
                    {Number(
                      position.investedUsd ||
                        0
                    ).toFixed(2)}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      opacity: 0.7,
                    }}
                  >
                    {t.current}: $
                    {Number(
                      position.currentPrice ||
                        0
                    ).toFixed(4)}
                    {' · '}
                    {t.value}: $
                    {Number(
                      position.currentValueUsd ||
                        0
                    ).toFixed(2)}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        Number(
                          position.unrealizedPnlUsd ||
                            0
                        ) >= 0
                          ? '#22c55e'
                          : '#ef4444',
                    }}
                  >
                    {t.unrealizedPnl}: $
                    {Number(
                      position.unrealizedPnlUsd ||
                        0
                    ).toFixed(2)}
                    {' · '}
                    {Number(
                      position.unrealizedPnlPct ||
                        0
                    ).toFixed(2)}
                    %
                  </div>

                  <button
                    onClick={() =>
                      closePaperPosition(
                        position
                      )
                    }
                    style={{
                      marginTop: 12,
                      width: '100%',
                      padding:
                        '10px 12px',
                      borderRadius: 8,
                      border:
                        '1px solid #dc2626',
                      background:
                        '#dc2626',
                      color: '#fff',
                      cursor:
                        'pointer',
                      fontWeight: 700,
                    }}
                  >
                    {
                      t.closePosition
                    }
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section
        style={{
          background: '#0b0f14',
          color: '#fff',
          borderRadius: 18,
          padding: 20,
          marginBottom: 30,
          boxShadow:
            '0 8px 30px rgba(0,0,0,0.14)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: 15,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: '#60a5fa',
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              NOEUL AI
            </div>

            <h2
              style={{
                margin:
                  '5px 0',
                fontSize: 25,
              }}
            >
              {t.aiTraining}
            </h2>

            <div
              style={{
                fontSize: 12,
                opacity: 0.55,
              }}
            >
              {trainingLoading
                ? t.trainingUpdating
                : t.trainingAutoRefresh}
            </div>
          </div>

          <div
            style={{
              padding:
                '7px 12px',
              borderRadius: 20,
              background:
                'rgba(59,130,246,0.15)',
              border:
                '1px solid rgba(96,165,250,0.35)',
              color: '#93c5fd',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {trainingStats.total}{' '}
            {t.samples}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(135px, 1fr))',
            gap: 10,
            marginTop: 20,
          }}
        >
          <TrainingMetric
            label={t.totalTrades}
            value={String(
              trainingStats.total
            )}
          />

          <TrainingMetric
            label={t.wins}
            value={String(
              trainingStats.wins
            )}
            valueColor="#22c55e"
          />

          <TrainingMetric
            label={t.losses}
            value={String(
              trainingStats.losses
            )}
            valueColor="#ef4444"
          />

          <TrainingMetric
            label={t.neutral}
            value={String(
              trainingStats.neutral
            )}
            valueColor="#eab308"
          />

          <TrainingMetric
            label={t.winRate}
            value={`${Number(
              trainingStats.winRate || 0
            ).toFixed(2)}%`}
          />

          <TrainingMetric
            label={t.trainingPnl}
            value={`$${Number(
              trainingStats.totalPnl || 0
            ).toFixed(2)}`}
            valueColor={
              Number(
                trainingStats.totalPnl || 0
              ) >= 0
                ? '#22c55e'
                : '#ef4444'
            }
          />

          <TrainingMetric
            label={t.averagePnl}
            value={`${Number(
              trainingStats.averagePnlPct || 0
            ).toFixed(2)}%`}
            valueColor={
              Number(
                trainingStats.averagePnlPct || 0
              ) >= 0
                ? '#22c55e'
                : '#ef4444'
            }
          />
        </div>

        <div
          style={{
            marginTop: 25,
          }}
        >
          <h3
            style={{
              marginBottom: 10,
            }}
          >
            {t.aiDecisionResults}
          </h3>

          {trainingRows.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                background: '#151b23',
                opacity: 0.7,
              }}
            >
              {t.noTrainingData}
            </div>
          ) : (
            trainingRows
              .slice(0, 10)
              .map((row: any) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 100px 120px',
                    gap: 10,
                    alignItems: 'center',
                    padding:
                      '12px 0',
                    borderBottom:
                      '1px solid #202733',
                  }}
                >
                  <div>
                    <strong>
                      {row.symbol}
                    </strong>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 11,
                        opacity: 0.5,
                      }}
                    >
                      {row.chain}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign:
                        'center',
                      fontSize: 12,
                      fontWeight: 800,
                      color:
                        row.result_label ===
                        'WIN'
                          ? '#22c55e'
                          : row.result_label ===
                            'LOSS'
                          ? '#ef4444'
                          : '#eab308',
                    }}
                  >
                    {
                      row.result_label
                    }
                  </div>

                  <div
                    style={{
                      textAlign:
                        'right',
                      fontWeight: 800,
                      color:
                        Number(
                          row.pnl_pct || 0
                        ) >= 0
                          ? '#22c55e'
                          : '#ef4444',
                    }}
                  >
                    {Number(
                      row.pnl_pct || 0
                    ) >= 0
                      ? '+'
                      : ''}
                    {Number(
                      row.pnl_pct || 0
                    ).toFixed(2)}
                    %
                  </div>
                </div>
              ))
          )}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 10,
            background: '#151b23',
            border:
              '1px solid #202733',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <strong>
            {t.modelStatus}
          </strong>

          <div
            style={{
              marginTop: 6,
              color: '#60a5fa',
              fontWeight: 800,
            }}
          >
            {t.dataCollection}
          </div>

          <div
            style={{
              marginTop: 8,
              opacity: 0.65,
            }}
          >
            {t.modelNotice}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            marginTop: 10,
          }}
        >
          <TrainingMetric
            label={t.linkedDecisions}
            value={String(
              linkedDecisions
            )}
            valueColor="#60a5fa"
          />

          <TrainingMetric
            label={t.unlinkedTrades}
            value={String(
              unlinkedTrades
            )}
            valueColor="#f59e0b"
          />
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 10,
            background: '#151b23',
            border:
              '1px solid #202733',
            fontSize: 12,
            lineHeight: 1.7,
            opacity: 0.75,
          }}
        >
          <strong>
            {t.trainingData}
          </strong>
          <br />
          {trainingStats.total}{' '}
          {t.samples}
        </div>
      </section>

      <h1
        style={{
          marginBottom: 8,
        }}
      >
        {t.multiChain}
      </h1>

      <p
        style={{
          opacity: 0.7,
        }}
      >
        {t.description}
      </p>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 25,
          flexWrap: 'wrap',
        }}
      >
        {[
          'solana',
          'bsc',
          'robinhood',
        ].map((item) => (
          <button
            key={item}
            onClick={() =>
              setChain(item)
            }
            style={{
              padding:
                '10px 16px',
              borderRadius: 8,
              border:
                '1px solid #ccc',
              background:
                chain === item
                  ? '#111'
                  : '#fff',
              color:
                chain === item
                  ? '#fff'
                  : '#111',
              cursor:
                'pointer',
              fontWeight: 600,
            }}
          >
            {item ===
            'solana'
              ? 'Solana'
              : item === 'bsc'
              ? 'BNB Chain'
              : 'Robinhood Chain'}
          </button>
        ))}
      </div>

      <p
        style={{
          marginTop: 18,
        }}
      >
        {t.selectedChain}:{' '}
        <strong>
          {chain}
        </strong>
      </p>

      <button
        onClick={runScan}
        disabled={loading}
        style={{
          marginTop: 5,
          padding:
            '13px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#111',
          color: '#fff',
          cursor: loading
            ? 'wait'
            : 'pointer',
          fontWeight: 700,
        }}
      >
        {loading
          ? t.analyzing
          : t.runScan}
      </button>

      {result?.candidates
        ?.length > 0 && (
        <section
          style={{
            marginTop: 35,
          }}
        >
          <h2>
            {t.topCandidates}
          </h2>

          <p
            style={{
              opacity: 0.65,
            }}
          >
            {
              result.totalCandidates
            }{' '}
            {
              t.candidatesAnalyzed
            }
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
              (
                candidate: any
              ) => (
                <button
                  key={
                    candidate.address
                  }
                  onClick={() =>
                    setSelected(
                      candidate
                    )
                  }
                  style={{
                    textAlign:
                      'left',
                    padding: 18,
                    border:
                      selected?.address ===
                      candidate.address
                        ? '2px solid #111'
                        : '1px solid #ddd',
                    background:
                      '#fff',
                    cursor:
                      'pointer',
                    boxShadow:
                      '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center',
                    }}
                  >
                    <strong
                      style={{
                        fontSize:
                          18,
                      }}
                    >
                      #
                      {
                        candidate.finalRank
                      }{' '}
                      {
                        candidate.symbol
                      }
                    </strong>

                    <span
                      style={{
                        fontWeight:
                          800,
                        fontSize:
                          20,
                      }}
                    >
                      {
                        candidate.score
                      }
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color:
                        actionColor(
                          candidate.action
                        ),
                      fontWeight:
                        800,
                    }}
                  >
                    {
                      candidate.action
                    }
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      lineHeight: 1.7,
                      opacity: 0.75,
                    }}
                  >
                    {t.liquidity}: $
                    {Number(
                      candidate.market
                        ?.liquidityUsd ||
                        0
                    ).toLocaleString()}

                    <br />

                    {t.volume1h}: $
                    {Number(
                      candidate.market
                        ?.volume1hUsd ||
                        0
                    ).toLocaleString()}

                    <br />

                    {t.top10}:{' '}
                    {Number(
                      candidate
                        .security
                        ?.top10HolderPct ||
                        0
                    ).toFixed(1)}
                    %

                    <br />

                    {t.whale}:{' '}
                    {Number(
                      candidate.whale
                        ?.percentageOfSupply ||
                        0
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
            border:
              '1px solid #ddd',
            background:
              '#fafafa',
          }}
        >
          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              gap: 20,
              flexWrap:
                'wrap',
            }}
          >
            <div>
              <h2
                style={{
                  marginBottom: 5,
                }}
              >
                {selected.name} (
                {selected.symbol})
              </h2>

              <div
                style={{
                  fontSize: 13,
                  opacity: 0.6,
                  wordBreak:
                    'break-all',
                }}
              >
                {
                  selected.address
                }
              </div>
            </div>

            <div
              style={{
                textAlign:
                  'right',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                }}
              >
                {
                  selected.score
                }
                /100
              </div>

              <div
                style={{
                  color:
                    actionColor(
                      selected.action
                    ),
                  fontWeight:
                    900,
                  fontSize: 18,
                }}
              >
                {
                  selected.action
                }
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
              label={t.liquidity}
              value={`$${Number(
                selected.market
                  ?.liquidityUsd ||
                  0
              ).toLocaleString()}`}
            />

            <Metric
              label={t.volume1h}
              value={`$${Number(
                selected.market
                  ?.volume1hUsd ||
                  0
              ).toLocaleString()}`}
            />

            <Metric
              label={t.top10}
              value={`${Number(
                selected.security
                  ?.top10HolderPct ||
                  0
              ).toFixed(2)}%`}
            />

            <Metric
              label={t.whale}
              value={`${Number(
                selected.whale
                  ?.percentageOfSupply ||
                  0
              ).toFixed(2)}%`}
            />

            <Metric
              label={t.fiveMin}
              value={`${Number(
                selected.market
                  ?.priceChange5mPct ||
                  0
              ).toFixed(2)}%`}
            />

            <Metric
              label={t.oneHour}
              value={`${Number(
                selected.market
                  ?.priceChange1hPct ||
                  0
              ).toFixed(2)}%`}
            />
          </div>

          <h3
            style={{
              marginTop: 30,
            }}
          >
            {t.agentHandoff}
          </h3>

          <div>
            {selected.agents?.map(
              (
                agent: any,
                index: number
              ) => (
                <div
                  key={index}
                  style={{
                    padding:
                      '12px 0',
                    borderBottom:
                      '1px solid #ddd',
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                    }}
                  >
                    <strong>
                      {
                        agent.name
                      }
                    </strong>

                    <span
                      style={{
                        color:
                          statusColor(
                            agent.status
                          ),
                        fontWeight:
                          800,
                      }}
                    >
                      {
                        agent.status
                      }{' '}
                      {
                        agent.score
                      }
                      /100
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      opacity: 0.7,
                    }}
                  >
                    {
                      agent.note
                    }
                  </div>
                </div>
              )
            )}
          </div>

          <h3
            style={{
              marginTop: 30,
            }}
          >
            {t.topWhales}
          </h3>

          {selected.topWhales
            ?.length > 0 ? (
            selected.topWhales.map(
              (
                whale: any,
                index: number
              ) => (
                <div
                  key={
                    whale.walletAddress
                  }
                  style={{
                    padding:
                      '12px 0',
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
                      color:
                        actionColor(
                          whale.action
                        ),
                    }}
                  >
                    {
                      whale.action
                    }
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
                    {
                      whale.walletAddress
                    }
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                    }}
                  >
                    Net Flow:{' '}
                    {Number(
                      whale.netAmount ||
                        0
                    ).toLocaleString()}{' '}
                    · Transactions:{' '}
                    {
                      whale.transactionCount
                    }
                  </div>
                </div>
              )
            )
          ) : (
            <p>
              {
                t.noWhaleData
              }
            </p>
          )}

          <h3
            style={{
              marginTop: 30,
            }}
          >
            {t.riskSecurity}
          </h3>

          <p>
            {t.mintAuthority}:{' '}
            <strong>
              {selected.security
                ?.mintAuthority
                ? t.active
                : t.disabled}
            </strong>
          </p>

          <p>
            {t.freezeAuthority}:{' '}
            <strong>
              {selected.security
                ?.freezeAuthority
                ? t.active
                : t.disabled}
            </strong>
          </p>

          <p>
            {t.boost}:{' '}
            <strong>
              {selected.boost
                ?.active
                ? `ACTIVE (${selected.boost.amount})`
                : t.none}
            </strong>
          </p>

          <h3
            style={{
              marginTop: 30,
            }}
          >
            {t.decisionReasons}
          </h3>

          <ul>
            {selected.reasons?.map(
              (
                reason: string,
                index: number
              ) => (
                <li
                  key={index}
                >
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

function TrainingMetric({
  label,
  value,
  valueColor = '#fff',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: '#151b23',
        borderRadius: 12,
        padding: 14,
        border:
          '1px solid #202733',
      }}
    >
      <div
        style={{
          fontSize: 11,
          opacity: 0.5,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 21,
          fontWeight: 900,
          color: valueColor,
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
        border:
          '1px solid #ddd',
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