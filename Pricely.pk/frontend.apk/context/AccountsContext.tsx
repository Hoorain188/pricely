import React, { createContext, useContext, useState, ReactNode } from 'react';

// A local, in-memory stand-in for a real accounts database. Passwords are
// kept in plaintext here ONLY because this is a mock — a real backend must
// hash them. Lets login actually check "did this person sign up" instead
// of accepting any email/password combination.
export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'support' | 'readonly';
}

interface AccountsContextValue {
  registerAccount: (account: Omit<Account, 'id'>) => Account;
  updateAccountPassword: (email: string, password: string) => boolean;
  findAccount: (email: string, password: string) => Account | undefined;
  accountExists: (email: string) => boolean;
}

const AccountsContext = createContext<AccountsContextValue | undefined>(undefined);

// Seeded so the 3 real admins + a demo shopper can actually log in locally.
// Synthetic demo passwords only — never real credentials.
const SEED_ACCOUNTS: Account[] = [
  { id: 'a-t1', name: 'Hoorain', email: 'hoorain@gmail.com', password: 'Admin@123', role: 'admin' },
  { id: 'a-t2', name: 'Samad', email: 'samad@gmail.com', password: 'Support@123', role: 'support' },
  { id: 'a-t3', name: 'Noor', email: 'noor@gmail.com', password: 'Readonly@123', role: 'readonly' },
  { id: 'a-u1', name: 'Amina Raza', email: 'amina.raza@gmail.com', password: 'demo-pass-404!', role: 'user' },
];

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(SEED_ACCOUNTS);

  const registerAccount = (account: Omit<Account, 'id'>) => {
    const record: Account = { ...account, id: `a-${Date.now()}` };
    setAccounts((prev) => [...prev, record]);
    return record;
  };

  const updateAccountPassword = (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    let updated = false;
    setAccounts((prev) =>
      prev.map((account) => {
        if (account.email.toLowerCase() === normalized) {
          updated = true;
          return { ...account, password };
        }
        return account;
      })
    );
    return updated;
  };

  const findAccount = (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    return accounts.find((a) => a.email.toLowerCase() === normalized && a.password === password);
  };

  const accountExists = (email: string) => {
    const normalized = email.trim().toLowerCase();
    return accounts.some((a) => a.email.toLowerCase() === normalized);
  };

  return (
    <AccountsContext.Provider value={{ registerAccount, updateAccountPassword, findAccount, accountExists }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccountsStore() {
  const ctx = useContext(AccountsContext);
  if (!ctx) throw new Error('useAccountsStore must be used within an AccountsProvider');
  return ctx;
}
