import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

interface Settings {
  speed: number;
  gridSize: number;
  colorScheme: 'classic' | 'neon' | 'retro';
}

const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
const INITIAL_FOOD: Position = { x: 15, y: 15 };

const colorSchemes = {
  classic: {
    snake: '#00FF00',
    food: '#FF0000',
    background: '#000000',
    grid: '#333333',
    text: '#FFFFFF'
  },
  neon: {
    snake: '#00FFFF',
    food: '#FF00FF',
    background: '#0A0A0A',
    grid: '#1A1A1A',
    text: '#00FFFF'
  },
  retro: {
    snake: '#FFFF00',
    food: '#FF8800',
    background: '#2A2A2A',
    grid: '#404040',
    text: '#FFFF00'
  }
};

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>(INITIAL_FOOD);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<number[]>([]);
  const [settings, setSettings] = useState<Settings>({
    speed: 150,
    gridSize: 20,
    colorScheme: 'classic'
  });

  const currentColors = colorSchemes[settings.colorScheme];

  // Load high scores from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('snakeHighScores');
    if (saved) {
      setHighScores(JSON.parse(saved));
    }
  }, []);

  // Save high scores to localStorage
  const saveHighScores = (scores: number[]) => {
    localStorage.setItem('snakeHighScores', JSON.stringify(scores));
    setHighScores(scores);
  };

  // Generate random food position
  const generateFood = useCallback((snakeBody: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * settings.gridSize),
        y: Math.floor(Math.random() * settings.gridSize)
      };
    } while (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, [settings.gridSize]);

  // Move snake
  const moveSnake = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    setSnake(currentSnake => {
      const newSnake = [...currentSnake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      // Check wall collision
      if (head.x < 0 || head.x >= settings.gridSize || head.y < 0 || head.y >= settings.gridSize) {
        setGameState('GAME_OVER');
        return currentSnake;
      }

      // Check self collision
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameState('GAME_OVER');
        return currentSnake;
      }

      newSnake.unshift(head);

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(prevScore => prevScore + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameState, generateFood, settings.gridSize]);

  // Game loop
  useEffect(() => {
    if (gameState === 'PLAYING') {
      const gameInterval = setInterval(moveSnake, settings.speed);
      return () => clearInterval(gameInterval);
    }
  }, [moveSnake, gameState, settings.speed]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState === 'PLAYING') {
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
            if (direction !== 'DOWN') setDirection('UP');
            break;
          case 'ArrowDown':
          case 's':
            if (direction !== 'UP') setDirection('DOWN');
            break;
          case 'ArrowLeft':
          case 'a':
            if (direction !== 'RIGHT') setDirection('LEFT');
            break;
          case 'ArrowRight':
          case 'd':
            if (direction !== 'LEFT') setDirection('RIGHT');
            break;
          case ' ':
            setGameState('PAUSED');
            break;
        }
      } else if (gameState === 'PAUSED' && e.key === ' ') {
        setGameState('PLAYING');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, gameState]);

  // Start new game
  const startNewGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(generateFood(INITIAL_SNAKE));
    setDirection('RIGHT');
    setScore(0);
    setGameState('PLAYING');
  };

  // Handle game over
  useEffect(() => {
    if (gameState === 'GAME_OVER' && score > 0) {
      const newHighScores = [...highScores, score]
        .sort((a, b) => b - a)
        .slice(0, 10);
      saveHighScores(newHighScores);
    }
  }, [gameState, score, highScores]);

  const renderGame = () => (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex justify-between items-center w-full max-w-md">
        <div className="text-xl font-mono" style={{ color: currentColors.text }}>
          Счет: {score}
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setGameState('PAUSED')}
            disabled={gameState !== 'PLAYING'}
            variant="outline"
          >
            <Icon name="Pause" size={16} />
          </Button>
          <Button onClick={() => setGameState('MENU')} variant="outline">
            <Icon name="Home" size={16} />
          </Button>
        </div>
      </div>
      
      <div
        className="relative border-2"
        style={{
          backgroundColor: currentColors.background,
          borderColor: currentColors.grid,
          width: settings.gridSize * 20,
          height: settings.gridSize * 20
        }}
      >
        {/* Grid */}
        <div className="absolute inset-0">
          {Array.from({ length: settings.gridSize }).map((_, row) =>
            Array.from({ length: settings.gridSize }).map((_, col) => (
              <div
                key={`${row}-${col}`}
                className="absolute border"
                style={{
                  left: col * 20,
                  top: row * 20,
                  width: 20,
                  height: 20,
                  borderColor: currentColors.grid,
                  borderWidth: '0.5px'
                }}
              />
            ))
          )}
        </div>
        
        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute"
            style={{
              left: segment.x * 20,
              top: segment.y * 20,
              width: 20,
              height: 20,
              backgroundColor: currentColors.snake,
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: index === 0 ? '0 0 10px rgba(0,255,0,0.5)' : 'none'
            }}
          />
        ))}
        
        {/* Food */}
        <div
          className="absolute animate-pulse"
          style={{
            left: food.x * 20,
            top: food.y * 20,
            width: 20,
            height: 20,
            backgroundColor: currentColors.food,
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 0 15px rgba(255,0,0,0.8)'
          }}
        />
      </div>

      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <Card>
            <CardContent className="text-center p-6">
              <h3 className="text-xl font-mono mb-4">ПАУЗА</h3>
              <Button onClick={() => setGameState('PLAYING')}>
                Продолжить
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <Card>
            <CardContent className="text-center p-6">
              <h3 className="text-xl font-mono mb-2" style={{ color: currentColors.text }}>
                ИГРА ОКОНЧЕНА
              </h3>
              <p className="text-lg mb-4">Счет: {score}</p>
              <div className="space-x-2">
                <Button onClick={startNewGame}>
                  Играть снова
                </Button>
                <Button onClick={() => setGameState('MENU')} variant="outline">
                  В меню
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen p-4"
      style={{
        backgroundColor: currentColors.background,
        color: currentColors.text,
        fontFamily: 'monospace'
      }}
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 pixel-text">
          🐍 SNAKE GAME 🎮
        </h1>

        {gameState === 'MENU' ? (
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="main">Главная</TabsTrigger>
              <TabsTrigger value="records">Рекорды</TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
              <TabsTrigger value="game">Игра</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Добро пожаловать в Snake!</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p>Классическая игра Змейка в пиксельном стиле</p>
                  <div className="space-y-2">
                    <Button onClick={startNewGame} size="lg" className="w-full">
                      <Icon name="Play" className="mr-2" size={20} />
                      Начать игру
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Управление: WASD или стрелки, Пробел - пауза
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">🏆 Таблица рекордов</CardTitle>
                </CardHeader>
                <CardContent>
                  {highScores.length > 0 ? (
                    <div className="space-y-2">
                      {highScores.map((score, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 rounded"
                          style={{ backgroundColor: currentColors.grid }}
                        >
                          <span>#{index + 1}</span>
                          <span className="font-bold">{score} очков</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      Пока нет рекордов. Сыграйте первую игру!
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>⚙️ Настройки игры</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Скорость игры: {settings.speed}ms
                    </label>
                    <Slider
                      value={[settings.speed]}
                      onValueChange={([value]) => 
                        setSettings(prev => ({ ...prev, speed: value }))
                      }
                      max={300}
                      min={50}
                      step={10}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Размер поля: {settings.gridSize}x{settings.gridSize}
                    </label>
                    <Slider
                      value={[settings.gridSize]}
                      onValueChange={([value]) => 
                        setSettings(prev => ({ ...prev, gridSize: value }))
                      }
                      max={30}
                      min={15}
                      step={1}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Цветовая схема
                    </label>
                    <Select
                      value={settings.colorScheme}
                      onValueChange={(value: 'classic' | 'neon' | 'retro') =>
                        setSettings(prev => ({ ...prev, colorScheme: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Классическая</SelectItem>
                        <SelectItem value="neon">Неоновая</SelectItem>
                        <SelectItem value="retro">Ретро</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="game">
              <div className="text-center">
                <Button onClick={startNewGame} size="lg">
                  Начать игру
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          renderGame()
        )}
      </div>
    </div>
  );
};

export default Index;