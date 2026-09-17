import fs from "fs";
import path from "path";

import type {
  PaperPosition,
  PaperTradeResult,
} from "./engine";

export type PaperAccount = {
  balanceUsd: number;
  positions: PaperPosition[];
  trades: PaperTradeResult[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(
  DATA_DIR,
  "paper-account.json"
);

const DEFAULT_ACCOUNT: PaperAccount = {
  balanceUsd: 1000,
  positions: [],
  trades: [],
};

function loadAccount(): PaperAccount {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(DATA_DIR, {
        recursive: true,
      });

      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
          DEFAULT_ACCOUNT,
          null,
          2
        )
      );

      return {
        ...DEFAULT_ACCOUNT,
        positions: [],
        trades: [],
      };
    }

    const raw = fs.readFileSync(
      DATA_FILE,
      "utf8"
    );

    return JSON.parse(raw) as PaperAccount;
  } catch {
    return {
      ...DEFAULT_ACCOUNT,
      positions: [],
      trades: [],
    };
  }
}

function saveAccount(
  account: PaperAccount
): void {
  fs.mkdirSync(DATA_DIR, {
    recursive: true,
  });

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(account, null, 2)
  );
}

export function getPaperAccount(): PaperAccount {
  return loadAccount();
}

export function addPosition(
  position: PaperPosition
): void {
  const account = loadAccount();

  account.positions.push(position);
  account.balanceUsd -= position.investedUsd;

  saveAccount(account);
}

export function closePosition(
  trade: PaperTradeResult
): void {
  const account = loadAccount();

  account.positions = account.positions.filter(
    (position) =>
      !(
        position.token === trade.token &&
        position.openedAt === trade.openedAt
      )
  );

  account.balanceUsd += trade.exitValueUsd;
  account.trades.push(trade);

  saveAccount(account);
}

export function getOpenPosition(
  token: string
): PaperPosition | undefined {
  const account = loadAccount();

  return account.positions.find(
    (position) => position.token === token
  );
}
