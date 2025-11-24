// App.js

import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import ExpensesScreen from './ExpensesScreen';

export default function App() {
  return (
    <SQLiteProvider
      databaseName="expenses_v2.db"
      onInit={async (db) => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL
          );
        `);
      }}
    >
      <ExpensesScreen />
    </SQLiteProvider>
  );
}
