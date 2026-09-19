import { useState, useEffect } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  darkMode: boolean;
}

export default function TodoList({ darkMode }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('dashboard-todos');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Build something awesome', completed: true },
      { id: 2, text: 'Learn a new technology', completed: false },
      { id: 3, text: 'Take a break', completed: false },
    ];
  });
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    localStorage.setItem('dashboard-todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, { id: Date.now(), text: newTodo.trim(), completed: false }]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div className={`rounded-2xl p-6 backdrop-blur-xl h-full ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white/60 border border-white/40 shadow-lg'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          ✅ Tasks
        </h3>
        <span className={`text-sm px-2 py-1 rounded-lg ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
          {completedCount}/{todos.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className={`w-full h-2 rounded-full mb-4 ${darkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${todos.length ? (completedCount / todos.length) * 100 : 0}%` }}
        ></div>
      </div>

      {/* Add todo */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a task..."
          className={`flex-1 px-3 py-2 rounded-xl border outline-none transition-all text-sm ${darkMode ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-purple-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-purple-400'}`}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
        />
        <button
          onClick={addTodo}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          +
        </button>
      </div>

      {/* Todo list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${darkMode ? 'hover:bg-white/5' : 'hover:bg-white/40'}`}
          >
            <button
              onClick={() => toggleTodo(todo.id)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent' : darkMode ? 'border-gray-500' : 'border-gray-300'}`}
            >
              {todo.completed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm ${todo.completed ? (darkMode ? 'text-gray-500 line-through' : 'text-gray-400 line-through') : (darkMode ? 'text-gray-200' : 'text-gray-700')}`}>
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className={`opacity-0 group-hover:opacity-100 transition-opacity text-sm ${darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
            >
              ✕
            </button>
          </div>
        ))}
        {todos.length === 0 && (
          <p className={`text-center py-4 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No tasks yet. Add one above! 🎯
          </p>
        )}
      </div>
    </div>
  );
}
