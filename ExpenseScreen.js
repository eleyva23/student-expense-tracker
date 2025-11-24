import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('all');

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState(null); 

  const getToday = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY id DESC;'
    );
    setExpenses(rows);
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setNote('');
    setEditingId(null);
  };

  // Updating Expense 
  const saveExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) return;
    if (!category.trim()) return;

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim() || null;

    if (editingId === null) {
      // INSERT 
      const today = getToday();
      await db.runAsync(
        'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
        [amountNumber, trimmedCategory, trimmedNote, today]
      );
    } else {
      // UPDATE existing expense 
      await db.runAsync(
        'UPDATE expenses SET amount = ?, category = ?, note = ? WHERE id = ?;',
        [amountNumber, trimmedCategory, trimmedNote, editingId]
      );
    }

    resetForm();
    loadExpenses();
  };

  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses();
  };

  const getFilteredExpenses = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (filter === 'week') {
      return expenses.filter((e) => {
        const d = new Date(e.date);
        return d >= startOfWeek && d <= today;
      });
    }

    if (filter === 'month') {
      return expenses.filter((e) => {
        const d = new Date(e.date);
        return d >= startOfMonth && d <= today;
      });
    }

    return expenses;
  };

  const getTotalSpending = () => {
    const filtered = getFilteredExpenses();
    return filtered.reduce((sum, e) => sum + e.amount, 0);
  };

  const getTotalsByCategory = () => {
    const filtered = getFilteredExpenses();
    const totals = {};

    filtered.forEach((e) => {
      if (!totals[e.category]) totals[e.category] = 0;
      totals[e.category] += e.amount;
    });

    return totals;
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const startEditing = (item) => {
    setEditingId(item.id);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setNote(item.note || '');
  };

  const renderExpense = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>
          ${Number(item.amount).toFixed(2)}
        </Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        {item.note ? (
          <Text style={styles.expenseNote}>{item.note}</Text>
        ) : null}
        <Text style={styles.dateText}>{item.date}</Text>
      </View>

      <TouchableOpacity onPress={() => startEditing(item)}>
        <Text style={styles.edit}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const currentFilterLabel =
    filter === 'all' ? 'All' : filter === 'week' ? 'This Week' : 'This Month';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

      <View style={styles.filterRow}>
        <Button title="All" onPress={() => setFilter('all')} />
        <Button title="This Week" onPress={() => setFilter('week')} />
        <Button title="This Month" onPress={() => setFilter('month')} />
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />

        <Button
          title={editingId === null ? 'Add Expense' : 'Save Changes'}
          onPress={saveExpense}
        />
        {editingId !== null && (
          <View style={{ marginTop: 8 }}>
            <Button title="Cancel Edit" onPress={resetForm} color="#6b7280" />
          </View>
        )}
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryHeading}>
          Total Spending ({currentFilterLabel}):
        </Text>

        <Text style={styles.summaryValue}>
          ${getTotalSpending().toFixed(2)}
        </Text>

        <Text style={styles.summaryHeading}>By Category:</Text>

        {Object.entries(getTotalsByCategory()).map(([cat, total]) => (
          <Text key={cat} style={styles.summaryCategory}>
            • {cat}: ${total.toFixed(2)}
          </Text>
        ))}
      </View>

      <FlatList
        data={getFilteredExpenses()}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet.</Text>
        }
      />

      <Text style={styles.footer}>
        Enter your expenses and they’ll be saved locally with SQLite.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 16 },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  form: { marginBottom: 16, gap: 8 },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: { fontSize: 18, fontWeight: '700', color: '#fbbf24' },
  expenseCategory: { fontSize: 14, color: '#e5e7eb' },
  expenseNote: { fontSize: 12, color: '#9ca3af' },
  dateText: { fontSize: 12, color: '#93c5fd' },
  edit: { color: '#60a5fa', fontSize: 14, marginHorizontal: 8 },
  delete: { color: '#f87171', fontSize: 20, marginLeft: 4 },
  empty: { color: '#9ca3af', marginTop: 24, textAlign: 'center' },
  footer: { textAlign: 'center', color: '#6b7280', marginTop: 12, fontSize: 12 },
  summaryBox: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryHeading: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryCategory: {
    color: '#e5e7eb',
    fontSize: 14,
    marginLeft: 8,
  },
});



    