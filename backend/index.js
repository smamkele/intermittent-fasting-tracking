import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from './middleware/auth.js'

const prisma = new PrismaClient()
const app = express()

app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Helper: Generate JWT Token
const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// 1. REGISTER
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' })
    }

    // Hash password with salt round of 10
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name
      },
      select: { id: true, email: true, name: true, createdAt: true }
    })

    const token = generateToken(user.id, user.email)

    res.status(201).json({ user, token })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = generateToken(user.id, user.email)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 3. GET CURRENT USER (Protected Check)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, activeProtocol: true, customGoalHours: true }
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET Active Fast
app.get('/api/fasts/active', authenticateToken, async (req, res) => {
  try {
    const activeFast = await prisma.fastLog.findFirst({
      where: { userId: req.user.userId, endTime: null },
      orderBy: { startTime: 'desc' }
    })
    res.json(activeFast)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// START Fast
app.post('/api/fasts/start', authenticateToken, async (req, res) => {
  // Debug log to verify req.user
  console.log('Decoded JWT user object:', req.user)

  // Ensure you get the exact string ID corresponding to the database primary key
  const userId = req.user?.id || req.user?.userId || req.user?.sub

  if (!userId) {
    return res.status(401).json({ error: 'Missing user ID in token.' })
  }

  // Double check if the user actually exists in the DB before inserting
  const userExists = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!userExists) {
    return res.status(404).json({ error: `User with ID ${userId} does not exist in the database.` })
  }

  try {
    const fast = await prisma.fastLog.create({
      data: {
        userId: userId,
        protocol: req.body.protocol || 'ADF_36_12',
        targetHours: Number(req.body.targetHours) || 36,
        startTime: req.body.startTime ? new Date(req.body.startTime) : new Date()
      }
    })
    res.status(201).json(fast)
  } catch (error) {
    console.error('Prisma Error:', error)
    res.status(400).json({ error: error.message })
  }
})

// END Fast
app.patch('/api/fasts/:fastId/end', authenticateToken, async (req, res) => {
  const { moodRating, journalNotes, completed } = req.body
  try {
    // Ensure the fast belongs to the authenticated user before updating
    const fast = await prisma.fastLog.updateMany({
      where: { id: req.params.fastId, userId: req.user.userId },
      data: {
        endTime: new Date(),
        completed: completed ?? true,
        moodRating,
        journalNotes
      }
    })
    res.json(fast)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// POST Weight Log
app.post('/api/weight', authenticateToken, async (req, res) => {
  const { weightKg } = req.body
  try {
    const entry = await prisma.weightLog.create({
      data: {
        userId: req.user.userId,
        weightKg: parseFloat(weightKg),
        recordedAt: new Date()
      }
    })
    res.json(entry)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET Analytics & History
app.get('/api/analytics', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  try {
    const totalFasts = await prisma.fastLog.count({ where: { userId, endTime: { not: null } } })
    const completedFasts = await prisma.fastLog.count({ where: { userId, completed: true } })

    const weightHistory = await prisma.weightLog.findMany({
      where: { userId },
      orderBy: { recordedAt: 'asc' },
      take: 30
    })

    const fastHistory = await prisma.fastLog.findMany({
      where: { userId, endTime: { not: null } },
      orderBy: { startTime: 'desc' },
      take: 15
    })

    res.json({
      totalFasts,
      completionRate: totalFasts > 0 ? Math.round((completedFasts / totalFasts) * 100) : 0,
      weightHistory,
      fastHistory
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(4000, () => console.log('Auth API running on http://localhost:4000'))