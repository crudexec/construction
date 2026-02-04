import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface VendorTokenPayload {
  vendorId: string
  email: string
  companyId: string
  type: 'vendor'
}

export function generateVendorToken(payload: VendorTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyVendorToken(token: string): VendorTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as VendorTokenPayload
    if (decoded.type !== 'vendor') {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function validateVendor(token: string) {
  const payload = verifyVendorToken(token)
  if (!payload) return null

  const vendor = await prisma.vendor.findFirst({
    where: {
      id: payload.vendorId,
      portalEmail: payload.email,
      isActive: true,
      status: {
        in: ['VERIFIED', 'PENDING_VERIFICATION'] // Allow pending vendors to login
      }
    },
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      portalEmail: true,
      phone: true,
      status: true,
      type: true,
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
          appName: true
        }
      }
    }
  })

  return vendor
}

export async function createVendorPortalAccess(
  vendorId: string,
  email: string,
  password: string
) {
  const hashedPassword = await hashPassword(password)

  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      portalEmail: email,
      portalPassword: hashedPassword
    }
  })
}

export async function updateVendorPassword(vendorId: string, newPassword: string) {
  const hashedPassword = await hashPassword(newPassword)

  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      portalPassword: hashedPassword
    }
  })
}
