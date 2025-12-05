# CourseMaster

CourseMaster is a full-stack web application that allows users to browse, purchase, and manage online courses. It features secure user authentication, Stripe-based payment integration, email notifications, and a responsive dashboard for users and admins.

---

## Features

- User Registration & Login with JWT authentication
- Password hashing with bcrypt
- Role-based access (user/admin)
- Browse and purchase courses
- Stripe checkout integration
- Email notifications for new users
- User dashboard with purchased courses
- Admin dashboard for managing courses

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Sadia126/coursemaster_server_side
cd coursemaster_server_side
````

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>
CLIENT_URL=http://localhost:5173
SMTP_HOST=<your_smtp_host>
SMTP_PORT=<your_smtp_port>
SMTP_USER=<your_email>
SMTP_PASS=<your_email_password_or_app_password>
```

4. Start the server:

```bash
npm run dev
```

5. Start the frontend (if separate):

```bash
cd client
npm install
npm run dev
```

---

## Environment Variables

| Variable                | Description                            |
| ----------------------- | -------------------------------------- |
| `PORT`                  | Server port (default: 5000)            |
| `URI`                   | MongoDB connection URI                 |
| `JWT_SECRET`            | Secret key for JWT authentication      |
| `STRIPE_SECRET_KEY`     | Stripe API secret key                  |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret key              |
| `CLIENT_URL`            | Frontend URL                           |
| `SMTP_HOST`             | SMTP host (e.g., smtp.gmail.com)       |
| `SMTP_PORT`             | SMTP port (587 for TLS)                |
| `SMTP_USER`             | Email address for sending emails       |
| `SMTP_PASS`             | Password or app password for the email |

---

## API Documentation

### Authentication

#### Register User

```
POST /api/register
```

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "passwordHash": "password123",
  "avatarUrl": "http://example.com/avatar.jpg"
}
```

**Response:**

```json
{
  "message": "Registration successful",
  "userId": "1234567890abcdef"
}
```

#### Login User

```
POST /api/login
```

**Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "user": { "name": "John Doe", "email": "john@example.com", ... }
}
```

#### Logout

```
POST /api/logout
```

**Response:**

```json
{ "message": "Logout successful" }
```

---

### Courses & Payments

#### Create Checkout Session

```
POST /api/create-checkout-session
```

**Headers:** `Authorization: Bearer <token>`
**Body:**

```json
{ "courseId": "course_id_here" }
```

**Response:**

```json
{ "url": "https://checkout.stripe.com/..." }
```

#### Get Session

```
GET /api/session/:id
```

**Response:**

```json
{ "id": "session_id", "status": "complete", ... }
```

---

### Users

#### Get Current User

```
GET /api/me
```

**Headers:** `Authorization: Bearer <token>`
**Response:**

```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "purchasedCourses": [],
    ...
  }
}
```

---

## Technologies Used

* Node.js & Express
* MongoDB
* JWT Authentication
* Bcrypt for password hashing
* Nodemailer for email notifications
* Stripe API for payments
* React.js (frontend)
* Tailwind CSS & DaisyUI

---

