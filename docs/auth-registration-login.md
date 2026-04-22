# User Flow: Registration & Login

**Roles:** Public (registration) · All authenticated users (login)  
**Endpoints:** `POST /auth/register` · `POST /auth/login`  
**Feature:** Create an investor account and obtain a JWT for all subsequent requests

---

## Registration Flow

### Preconditions
- Email is not already registered in the system

### Steps

1. **Navigate** to `/register`
2. **Fill form:**
   - **Name** — required, free text (`String`)
   - **Email** — required, must be valid email format (`IsEmail` validator)
   - **Password** — required, minimum 6 characters (`MinLength(6)`)
3. **Submit** → `POST /auth/register`
4. **Server executes** inside `prisma.$transaction`:
   ```
   password = bcrypt.hash(plaintext, salt=10)

   user.create {
     email, name,
     password: hashedPassword,
     role: 'INVESTOR'   ← hardcoded; cannot self-register as ADMIN
   }

   portfolio.create {
     name: 'Default Portfolio',
     userId: user.id
   }
   ```
5. **Response** (password excluded):
   ```json
   { "id": 1, "email": "...", "name": "...", "role": "INVESTOR", "createdAt": "..." }
   ```
6. **Client** redirects to `/login`

### Postconditions
- One `User` row with `role = INVESTOR`
- One `Portfolio` row (`name = 'Default Portfolio'`) linked to the new user
- No `Account` rows yet — admin must create accounts separately via `POST /accounts/for-user`
- Password stored as bcrypt hash (10 salt rounds)

### Error Handling

| Scenario | Response |
|----------|----------|
| Email already registered | `ConflictException('Email already in use')` → HTTP 409 |
| Password too short | `class-validator` throws → HTTP 400 with validation errors |
| Invalid email format | `class-validator` throws → HTTP 400 |
| DB failure mid-transaction | Prisma rolls back; neither user nor portfolio created |

---

## Login Flow

### Preconditions
- User is registered

### Steps

1. **Navigate** to `/login`
2. **Fill form:** email and password
3. **Submit** → `POST /auth/login` with body `{ email, password }`
4. **Server:**
   ```
   user = prisma.user.findUnique({ where: { email } })
   if (!user) → UnauthorizedException('Wrong email or password')

   isMatch = bcrypt.compare(plaintext, user.password)
   if (!isMatch) → UnauthorizedException('Wrong email or password')

   payload = { sub: user.id, email: user.email, role: user.role }
   access_token = jwtService.signAsync(payload)
   ```
5. **Response:**
   ```json
   {
     "access_token": "<JWT>",
     "user": { "id": 1, "email": "...", "role": "INVESTOR", "name": "..." }
   }
   ```
6. **Client** stores `access_token` in `AuthContext` (and/or `localStorage`)
7. **Redirects** to `/dashboard`

### JWT Payload

```json
{ "sub": <userId>, "email": "<email>", "role": "INVESTOR" | "ADMIN" }
```

The `role` field in the JWT payload is what `RolesGuard` reads on every protected endpoint.

### Token Usage

All subsequent API calls include the header:
```
Authorization: Bearer <access_token>
```

`JwtAuthGuard` validates the token and attaches `req.user = { userId: sub, email, role }` to the request object.

### Error Handling

| Scenario | Response |
|----------|----------|
| Email not found | `UnauthorizedException('Wrong email or password')` → HTTP 401 |
| Wrong password | `UnauthorizedException('Wrong email or password')` → HTTP 401 |
| Expired token (on a subsequent request) | `JwtAuthGuard` returns HTTP 401 |
| Missing `Authorization` header | `JwtAuthGuard` returns HTTP 401 |
| JWT with wrong role for endpoint | `RolesGuard` returns HTTP 403 |

---

## UI Guards

- The `ExchangeFloatingWidget` is hidden on `/login` and `/register` pages via a `usePathname` check (not gated on auth state, which may not be immediately available)
- The `AuthContext` exposes `{ user, token, isLoading }` — pages check `isLoading` before rendering to avoid flash of unauthorized content