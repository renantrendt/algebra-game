"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { supabase, initializeDatabase, getTop3Ranking, getTop12Ranking } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

type Equation = {
  left: string
  right: number
  solution: number
  targetLetter: string
}

type Difficulty = "Easy" | "Medium"

type Player = {
  id?: number
  name: string
  score: number
  created_at?: string
}

type GameState = {
  solvedWords: string[]
  currentWordIndex: number
  difficulty: Difficulty
  isMediumUnlocked: boolean
  playerName: string
  score: number
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const EASY_WORDS = ["GAMES", "OF", "MATH", "ARE", "THE", "BEST", "FUNNIEST", "TYPE"]
const MEDIUM_WORDS = ["ALGEBRA", "EQUATION", "VARIABLE", "SOLUTION", "COEFFICIENT", "EXPONENT", "POLYNOMIAL"]

const saveGameState = (state: GameState) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("algebraGameState", JSON.stringify(state))
  }
}

const loadGameState = (): GameState | null => {
  if (typeof window !== "undefined") {
    const savedState = localStorage.getItem("algebraGameState")
    return savedState ? JSON.parse(savedState) : null
  }
  return null
}

const saveRanking = async (player: Player) => {
  if (player) {
    console.log('🎯 Tentando salvar ranking para jogador:', player)
    
    try {
      // Primeiro verifica se já existe um registro com este nome
      const { data: existing, error: searchError } = await supabase
        .from("ranking")
        .select('*')
        .eq('name', player.name)
        .limit(1)
        .maybeSingle()

      if (searchError) {
        console.error('❌ Erro ao buscar jogador existente:', searchError)
        return null
      }

      console.log('🔍 Resultado da busca:', existing)

      if (existing) {
        console.log('✏️ Atualizando jogador existente. ID:', existing.id, 'Score atual:', existing.score, 'Novo score:', player.score)
        // Atualiza o registro existente
        // Tenta atualizar o score
        const { error: updateError } = await supabase
          .from("ranking")
          .update({ score: player.score })
          .eq('id', existing.id)

        if (updateError) {
          console.error('❌ Erro ao atualizar ranking:', updateError)
          return null
        }

        // Busca o registro atualizado
        const { data: updated, error: selectError } = await supabase
          .from("ranking")
          .select('*')
          .eq('id', existing.id)
          .single()

        if (selectError || !updated) {
          console.error('❌ Erro ao buscar registro atualizado:', selectError)
          return null
        }

        // Verifica se o score foi realmente atualizado
        if (updated.score !== player.score) {
          console.error('❌ Score não foi atualizado corretamente:', { atual: updated.score, esperado: player.score })
          return null
        }

        console.log('✅ Ranking atualizado com sucesso:', updated)
        return updated
      } else {
        console.log('➕ Criando novo jogador no ranking')
        // Cria um novo registro
        const { data: inserted, error: insertError } = await supabase
          .from("ranking")
          .insert([
            { 
              name: player.name,
              score: player.score
            }
          ])
          .select()
          .maybeSingle()

        if (insertError) {
          console.error('❌ Erro ao criar ranking:', insertError)
          return null
        }

        console.log('✅ Novo jogador criado com sucesso:', inserted)
        return inserted
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao salvar ranking:', error)
      return null
    }
  }

  console.log('⚠️ Tentativa de salvar ranking com jogador nulo')
  return null
}

export default function AlgebraGame() {
  const [equation, setEquation] = useState<Equation | null>(null)
  const [playerAnswer, setPlayerAnswer] = useState("")
  const [revealedLetters, setRevealedLetters] = useState<Set<string>>(new Set())
  const [secretPhrase, setSecretPhrase] = useState("")
  const [feedback, setFeedback] = useState("")
  const [solvedWords, setSolvedWords] = useState<string[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showCompletedWord, setShowCompletedWord] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy")
  const [isMediumUnlocked, setIsMediumUnlocked] = useState(false)
  const [playerName, setPlayerName] = useState("")
  const [score, setScore] = useState(0)
  const [showNameModal, setShowNameModal] = useState(true)
  const [ranking, setRanking] = useState<Player[]>([])
  const [isRankingLoading, setIsRankingLoading] = useState(false)
  const [isDbInitialized, setIsDbInitialized] = useState(false)
  const [dbInitError, setDbInitError] = useState<string | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [showFullRanking, setShowFullRanking] = useState(false)
  const [fullRanking, setFullRanking] = useState<Player[]>([])

  // Carrega o player atual e seu score do Supabase
  const loadCurrentPlayer = useCallback(async () => {
    if (!isDbInitialized || !playerName) {
      console.log('⚠️ Banco não inicializado ou sem player name')
      return
    }

    console.log('🔄 Carregando dados do jogador:', playerName)
    try {
      const { data, error } = await supabase
        .from("ranking")
        .select('*')
        .eq('name', playerName)
        .single()

      if (error) throw error

      console.log('📊 Dados do jogador recebidos:', data)
      setCurrentPlayer(data)
      if (data) setScore(data.score)
    } catch (error) {
      console.error('❌ Erro ao carregar dados do jogador:', error)
      setCurrentPlayer(null)
    }
  }, [isDbInitialized, playerName])

  const loadRanking = useCallback(async () => {
    if (!isDbInitialized) {
      console.log('⚠️ Banco não inicializado ainda, ignorando loadRanking')
      return
    }

    console.log('🔄 Carregando ranking...')
    setIsRankingLoading(true)
    try {
      const [top3Data, top12Data] = await Promise.all([
        getTop3Ranking(),
        getTop12Ranking()
      ])
      
      console.log('📊 Top 3 Ranking recebido:', top3Data)
      console.log('📊 Top 12 Ranking recebido:', top12Data)
      
      setRanking(top3Data || [])
      setFullRanking(top12Data || [])
    } catch (error) {
      console.error('❌ Erro ao carregar ranking:', error)
      setRanking([])
      setFullRanking([])
    } finally {
      setIsRankingLoading(false)
      console.log('✅ Processo de carregar ranking finalizado')
    }
  }, [isDbInitialized])

  const saveCurrentState = useCallback(() => {
    saveGameState({
      solvedWords,
      currentWordIndex,
      difficulty,
      isMediumUnlocked,
      playerName,
      score,
    })
  }, [solvedWords, currentWordIndex, difficulty, isMediumUnlocked, playerName, score])

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase()
        setIsDbInitialized(true)
        setDbInitError(null)
      } catch (error) {
        console.error("Failed to initialize database:", error)
        setDbInitError(error instanceof Error ? error.message : String(error))
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (isDbInitialized) {
      // SEMPRE mostra o modal e reseta o jogo
      setShowNameModal(true)
      setPlayerName('')
      setScore(0)
      setSolvedWords([])
      setCurrentWordIndex(0)
      setDifficulty('Easy')
      setIsMediumUnlocked(false)
      loadRanking()
      setIsInitialized(true)
    }
  }, [isDbInitialized, loadRanking])

  useEffect(() => {
    if (isInitialized && !showNameModal) {
      startNewWord()
    }
  }, [isInitialized, showNameModal])

  useEffect(() => {
    if (isInitialized) {
      saveCurrentState()
    }
  }, [isInitialized, saveCurrentState])

  useEffect(() => {
    if (isInitialized) {
      saveCurrentState()
    }
  }, [isInitialized, saveCurrentState])

  useEffect(() => {
    if (difficulty === "Easy" && solvedWords.length === EASY_WORDS.length) {
      setIsMediumUnlocked(true)
      saveCurrentState()
    }
  }, [difficulty, solvedWords, saveCurrentState])

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = playerName.trim()
    if (cleanName) {
      setPlayerName(cleanName) // Atualiza o nome limpo
      setShowNameModal(false)
      
      // Carrega os dados do jogador quando o nome é definido
      loadCurrentPlayer()
      
      startNewWord()
    }
  }

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    if (newDifficulty === difficulty) return
    if (newDifficulty === "Medium" && !isMediumUnlocked) return
    setDifficulty(newDifficulty)
    setSolvedWords([])
    setCurrentWordIndex(0)
    setRevealedLetters(new Set())
    setShowCompletedWord(false)
    startNewWord()
  }

  const startNewWord = useCallback(() => {
    setShowCompletedWord(false)
    const words = difficulty === "Easy" ? EASY_WORDS : MEDIUM_WORDS
    if (currentWordIndex >= words.length) {
      setFeedback(`Congratulations! You've solved all the ${difficulty} words!`)
      setEquation(null)
      setSecretPhrase("")
      return
    }

    const currentWord = words[currentWordIndex]
    setSecretPhrase(currentWord)
    setRevealedLetters(new Set())
    setFeedback("")
    const newEquation = generateEquation(currentWord, new Set())
    if (newEquation) {
      setEquation(newEquation)
    } else {
      setCurrentWordIndex((prevIndex) => prevIndex + 1)
      setTimeout(startNewWord, 0)
    }
  }, [difficulty, currentWordIndex])

  const generateEquation = (word: string, currentRevealedLetters: Set<string>): Equation | null => {
    const neededLetters = [...new Set(word.split(""))].filter((char) => !currentRevealedLetters.has(char))

    if (neededLetters.length === 0) {
      return null
    }

    const targetLetter = neededLetters[Math.floor(Math.random() * neededLetters.length)]
    const x = ALPHABET.indexOf(targetLetter) + 1

    const a = Math.floor(Math.random() * 5) + 1
    const b = Math.floor(Math.random() * 10)
    const right = a * x + b

    return {
      left: `${a}x + ${b}`,
      right,
      solution: x,
      targetLetter: targetLetter,
    }
  }

  const updateRanking = useCallback(async (newScore: number) => {
    if (!isDbInitialized) {
      console.log('⚠️ Banco não inicializado ainda, ignorando updateRanking')
      return
    }

    console.log('🔄 Iniciando atualização do ranking. Player:', playerName, 'Score:', newScore)
    try {
      const result = await saveRanking({ name: playerName, score: newScore })
      console.log('💾 Resultado do saveRanking:', result)
      
      // Atualiza o score local
      setScore(newScore)
      
      // Recarrega os dados do player e o ranking
      await Promise.all([
        loadCurrentPlayer(),
        loadRanking()
      ])
      
      console.log('✅ Ranking atualizado e recarregado com sucesso')
    } catch (error) {
      console.error('❌ Erro ao atualizar ranking:', error)
    }
  }, [playerName, loadCurrentPlayer, loadRanking, isDbInitialized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const answer = Number.parseInt(playerAnswer)

    if (equation && answer === equation.solution) {
      const newRevealedLetters = new Set(revealedLetters)
      newRevealedLetters.add(equation.targetLetter)
      setRevealedLetters(newRevealedLetters)
      setFeedback(`Correct! You revealed the letter ${equation.targetLetter}`)

      const newScore = score + 100
      // Atualiza o ranking imediatamente com o novo score
      await updateRanking(newScore)

      if ([...secretPhrase].every((char) => newRevealedLetters.has(char))) {
        setSolvedWords((prev) => [...prev, secretPhrase])
        setShowCompletedWord(true)
        setFeedback("Great job! You solved one of the words.")
        setTimeout(() => {
          setCurrentWordIndex((prevIndex) => prevIndex + 1)
          startNewWord()
        }, 3000)
      } else {
        const newEquation = generateEquation(secretPhrase, newRevealedLetters)
        if (newEquation) {
          setEquation(newEquation)
        }
      }
    } else {
      setFeedback("Try again!")
      const newScore = Math.max(0, score - 10)
      // Atualiza o ranking imediatamente com o novo score após erro
      await updateRanking(newScore)
    }
    setPlayerAnswer("")
  }

  const playerRank = ranking.findIndex((player) => player !== null && player.name === playerName) + 1

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadRanking()
    }, 60000) // Atualiza a cada minuto

    return () => clearInterval(intervalId)
  }, [loadRanking])

  if (dbInitError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-blue-200 p-4">
        <h1 className="text-2xl font-bold mb-4">Error Initializing Game</h1>
        <p className="text-red-600 mb-4">{dbInitError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (!isDbInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-blue-200 p-4">
        <h1 className="text-2xl font-bold mb-4">Initializing Game...</h1>
        <p>Please wait while we set up the game.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-blue-200 p-4">
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Welcome to the Algebra Game!</DialogTitle>
            <DialogDescription>Please enter your name to start playing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNameSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-4">
                <Input
                  id="name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Name"
                  className="w-full"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Start Game</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <h1 className="text-4xl font-bold mb-8 text-blue-800">Algebra Game</h1>

      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 mb-8">
        {equation && !showCompletedWord && (
          <div className="text-2xl mb-4 text-center">
            {equation.left} = {equation.right}
          </div>
        )}

        {!showCompletedWord && equation && (
          <form onSubmit={handleSubmit} className="mb-4 flex">
            <Input
              type="number"
              value={playerAnswer}
              onChange={(e) => setPlayerAnswer(e.target.value)}
              placeholder="Enter the value of x"
              className="mr-2 flex-grow"
            />
            <Button type="submit">Submit</Button>
          </form>
        )}

        <div className="text-xl mb-4 text-center">{feedback}</div>

        <div className="text-4xl font-mono text-center tracking-[1rem] mt-8">
          {secretPhrase.split("").map((char, index) => (
            <span
              key={index}
              className={`inline-block ${revealedLetters.has(char) || showCompletedWord ? "text-green-600 font-bold" : ""}`}
            >
              {revealedLetters.has(char) || showCompletedWord ? char : "_"}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 text-lg">Solved words: {solvedWords.join(", ")}</div>

      <div className="fixed top-4 left-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Player: {playerName}</h2>
        <p>Score: {score}</p>
        <p>Rank: {playerRank > 0 ? `#${playerRank}` : "Not ranked"}</p>
      </div>

      <div className="fixed bottom-4 left-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
        <div className="flex flex-col gap-2">
          <div
            className={`px-4 py-2 rounded border ${difficulty === "Easy" ? "bg-white" : "bg-gray-100"} cursor-pointer`}
            onClick={() => handleDifficultyChange("Easy")}
          >
            Easy
          </div>
          <div
            className={`px-4 py-2 rounded border ${
              !isMediumUnlocked
                ? "bg-gray-300 cursor-not-allowed"
                : difficulty === "Medium"
                  ? "bg-white"
                  : "bg-gray-100"
            } cursor-pointer`}
            onClick={() => handleDifficultyChange("Medium")}
          >
            Medium
          </div>
        </div>
      </div>

      {/* Top Players Card */}
      <div className="fixed top-4 right-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg min-w-[200px]">
        <h3 className="text-lg font-semibold mb-2">Top Players</h3>
        {isRankingLoading ? (
          <p className="text-center">Loading...</p>
        ) : ranking.length > 0 ? (
          <div className="space-y-2">
            {ranking.map((player, index) => (
              <div
                key={index}
                className={`flex justify-between items-center p-2 rounded ${index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-gray-100' : 'bg-yellow-50'}`}
              >
                <div className="flex items-center">
                  <span className="font-bold mr-2">#{index + 1}</span>
                  <span>{player.name}</span>
                </div>
                <span className="font-bold">{player.score}</span>
              </div>
            ))}
            {fullRanking.length > 3 && (
              <button
                onClick={() => setShowFullRanking(true)}
                className="w-full mt-2 py-1 text-gray-600 hover:text-gray-800 transition-colors text-center rounded border border-gray-200 hover:bg-gray-50"
              >
                Ver mais...
              </button>
            )}
          </div>
        ) : (
          <p className="text-center">No rankings available</p>
        )}
      </div>

      {/* Full Ranking Modal */}
      <Dialog open={showFullRanking} onOpenChange={setShowFullRanking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Ranking</DialogTitle>
            <DialogDescription>
              Top players from 4th to 12th place
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {fullRanking.slice(3).map((player, index) => (
              <div
                key={player.id || index}
                className="flex justify-between items-center p-2 bg-gray-100 rounded">
                <span>#{index + 4} {player.name}</span>
                <span>{player.score}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-4 right-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Alphabet</h2>
        <div className="grid grid-cols-4 gap-2">
          {ALPHABET.split("").map((letter, index) => (
            <div key={letter} className="flex flex-col items-center">
              <div className="text-xs mb-1">{index + 1}</div>
              <div
                className={`w-8 h-8 flex items-center justify-center border ${
                  revealedLetters.has(letter) ? "bg-green-500 text-white" : "bg-gray-200"
                }`}
              >
                {letter}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

