import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import GameInterface from './GameInterface';
// import './App.css'; // Remove this import - styles likely unused

function App() {
  return (
    <div className="App">
      <GameInterface />
      <Analytics />
    </div>
  );
}

export default App;
