---
title: Data models and state ownership
---

# Data models and state ownership

There is no shared application database. The main platform stores community
and opportunity data in MongoDB; the LMS stores structured learning data in
PostgreSQL. The only cross-system identity connection is the main VartaLang
user ID/email returned during SSO.

## Cross-service identity

```text
Main MongoDB User                          LMS PostgreSQL User
-----------------                          -------------------
_id (Mongo ObjectId)  --SSO identity-----> vartalang_user_id (string)
email                 --matched/unique---> email (unique)
name                  --initial sync-----> full_name
primaryRole           --mapped------------> role (student/instructor/admin)
profilePhoto          --initial sync-----> avatar_url
```

The databases do not share foreign keys. SSO user records can be provisioned
in the LMS at first sign-in. Main user deletion/account handling and LMS
soft-deletion are separate workflows; verify both systems when implementing
account lifecycle changes.

## Main platform MongoDB

```text
User
 |-- Match(user1,user2,status,expiresAt)
 |-- Chat(participants, block/delete state)
 |     `-- embedded messages(sender,text,read,translation,TTS audio)
 |-- Notification(recipient,sender,matchId/chatId,type,read)
 |-- Report(reporter,reportedUser,chatId,reason)
 |-- Job(postedBy,language,jobType,expiry,status)
 |-- Language(status,slug,guide fields)
 |     `-- embedded Resource(title,url,type,level,free/featured)
 `-- SSOCode(userId, hashed code, expiry)
```

### Main entity notes

- **User:** email/password or Google identity; primary/secondary learning
  languages; known languages with fluency; learner/teacher role; location;
  translation preference; optional profile and learning counters.
- **Match:** ordered user pair, status, and seven-day expiry. A unique index
  applies to ordered `(user1,user2)`; the controller also checks both pair
  directions. The TTL index deletes pending/rejected records, not accepted
  ones.
- **Chat:** participants and an embedded message array. `blockedBy` controls
  blocking; `deletedBy` hides a chat per participant; `clearedAt` stores each
  user's message-history cutoff. A new message can restore a hidden chat
  while retaining the caller's prior cutoff.
- **Message:** original text, sender, timestamp, read flag, optional
  translated text/language, and cached base64 TTS audio. Audio is embedded in
  MongoDB; moving it to object storage would require an API/data migration.
- **Notification:** match/message notification types with recipient/sender
  and optional match/chat references. Current unread-count behavior counts
  all recipient notifications.
- **Report:** reporter, reported user, associated chat, reason, timestamp.
  Reports are intentionally preserved by connection reset; bulk deletion is
  a separate admin operation.
- **Job:** language/proficiency/type, compensation, company/location,
  responsibilities, requirements, contact email, poster, view count, status,
  expiry. A TTL index removes it 30 days after expiry.
- **Language:** published/draft guide, slug, native name, script, regions,
  roadmap and embedded typed resources.
- **SSOCode:** only a hash is stored; the raw code is returned to the browser,
  expires in 60 seconds, and is consumed once.

## Learning PostgreSQL

```text
User
 |--< Course (instructor_id)
 |      |--< Module
 |      |      `--< Lesson
 |      |             `--< LessonProgress >-- User
 |      |--< Enrollment >-- User
 |      |--< Payment >------ User
 |      `---- optional course Group
 |
 |-- InstructorProfile (one-to-one)
 |-- UserStreakRecord (one-to-one)
 |-- GroupMember >-- Group
 `-- Message >-- Group
```

### Learning entity notes

- **User:** UUID primary key, nullable unique `vartalang_user_id`, unique
  email, name, LMS role, active/deleted state, avatar, and SSO login
  timestamps/counter.
- **InstructorProfile:** one-to-one profile with teaching details, languages,
  social links, and payout-related fields. Public profile responses must not
  leak payout details.
- **Course:** instructor, language, curriculum metadata, price, publication
  state, tags/resources, and approval audit fields. `managed_by_admin`
  identifies admin-owned editing.
- **Module/Lesson:** ordered curriculum tree. Lessons can reference a
  YouTube video ID and notes URL; preview is a lesson flag.
- **Enrollment:** unique learner/course row with active/completed/cancelled
  status and timestamps.
- **LessonProgress:** unique learner/lesson row; `completed_at` is nullable
  so a toggled-off lesson can have no completion timestamp.
- **Payment:** user/course, amount/currency, Razorpay order/payment IDs,
  signature, and created/paid/failed status.
- **Group/GroupMember/Message:** course/community group records. Enrollment
  adds a learner to a course-linked group when one exists.
- **UserStreakRecord:** current/longest streak, total days, last local date,
  and date history.
- **PracticeLab/PracticeSession:** lab metadata and recorded score/feedback.
  The current evaluation route writes a fixed sample result.
- **Challenge/ChallengeLeaderboard:** challenge metadata and rank/XP rows.
  Default fallback leaderboard rows are static sample content.
- **Certification/UserCertification:** certification definitions and
  verification records.
- **Article:** editorial content.
- **JobPosting/JobApplication:** LMS careers content/application records;
  this is distinct from the main MongoDB jobs board.

All normal LMS entities inherit UUID and created/updated timestamps from
`TimeStampedModel`. PostgreSQL changes are represented in
`vl-lms-backend/alembic/versions/`. Do not modify the live schema by editing
models alone; create, review, and apply a migration.

## Voice Challenge storage is separate

Voice Challenge audio submitted from the main Next.js application is stored
in a configured Google Drive folder, not in either database. Current code
uses the file name to encode language, main user ID, and timestamp, and checks
Drive for an existing language/user prefix. Consent text, selected script,
recording duration, score, and review status are not persisted by the route.
Changes to retention, duplicate detection, consent audit, review, or
deletion need an explicit storage/data design.

## Data-change checklist

Before changing a field, index, or lifecycle:

1. Identify the owning database/service.
2. Search controller queries and API response schemas, not only the model.
3. Check frontend consumers and SSO serialization.
4. For MongoDB, consider indexes, embedded-array growth, and TTL behavior.
5. For PostgreSQL, add and review an Alembic migration.
6. Consider backfill, soft-delete, payment/report audit, and rollback behavior.
7. Update this page and the API contract if observable behavior changes.
