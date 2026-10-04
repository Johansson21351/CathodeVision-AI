# CathodeVision AI System Flow

## Request flow

```mermaid
flowchart TD
    Browser[React frontend] -->|Register / login| Auth[Flask auth routes]
    Auth --> Users[(users)]
    Auth -->|JWT| Browser

    Browser -->|Upload image + JWT| Inspect[Flask inspection route]
    Inspect --> AI[Vision model]
    AI -->|Prediction| Inspections[(inspections)]
    Inspections --> Dashboard[Dashboard and inspection history]

    Browser -->|Create or update task + JWT| Tasks[Flask task routes]
    Tasks --> TaskTable[(tasks)]
    Tasks --> Categorize[Task categorization model]
    Categorize --> TaskTable

    Browser -->|Review inspection| Reviews[Inspection review route]
    Reviews --> InspectionReviews[(inspection_reviews)]

    Browser -->|Forgot password| Reset[Password reset flow]
    Reset --> ResetTokens[(password_reset_tokens)]
```

## Database relationships

```mermaid
erDiagram
    users ||--o{ tasks : owns
    users ||--o{ inspections : submits
    users ||--o{ password_reset_tokens : requests
    users ||--o{ inspection_reviews : writes
    inspections ||--o{ inspection_reviews : receives
```

## Persisted flow

1. A user registers. The password is hashed before it is stored in `users`.
2. The user logs in and receives a JWT. Protected requests use that token.
3. An authenticated user uploads an image. The AI result is stored in `inspections`.
4. Dashboard and inspection-history queries aggregate only that user’s rows.
5. A reviewer can record a correction in `inspection_reviews` without changing the original AI result.
6. Password-reset requests are represented by expiring, one-use token records in `password_reset_tokens`.
7. Tasks remain user-owned records in `tasks`; AI categorization updates the task’s category fields.