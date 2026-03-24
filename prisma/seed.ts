/**
 * prisma/seed.ts
 *
 * Development seed script for VWS FollowUp.
 *
 * Creates a realistic set of sample data so developers can immediately
 * explore and test the application without needing to manually enter data.
 *
 * Run with: npm run db:seed
 *
 * WARNING: This script is intended for development only. It will wipe
 * the existing data and replace it with fresh seed data. Never run this
 * against a production database.
 *
 * What gets seeded:
 *   - 1 owner account and 2 staff accounts
 *   - Business settings
 *   - 12 contacts across various pipeline stages
 *   - Tags
 *   - Tasks (open, overdue, completed)
 *   - Notes
 *   - Quotes at various statuses
 *   - Appointments
 *   - Activity records
 */

import { PrismaClient, UserRole, ContactStage, ContactType, ContactStatus, ContactSource, TaskPriority, TaskStatus, NoteType, QuoteStatus, AppointmentType, AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ---------------------------------------------------------------------------
  // Clean existing data (order matters due to foreign key constraints)
  // ---------------------------------------------------------------------------
  console.log("  Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.contactTag.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.businessSettings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ Existing data cleared.");

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  console.log("  Creating users...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const owner = await prisma.user.create({
    data: {
      name: "Alex Johnson",
      email: "owner@example.com",
      passwordHash,
      role: UserRole.OWNER,
      isActive: true,
    },
  });

  const staffMember1 = await prisma.user.create({
    data: {
      name: "Sam Rivera",
      email: "sam@example.com",
      passwordHash,
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  const staffMember2 = await prisma.user.create({
    data: {
      name: "Jordan Lee",
      email: "jordan@example.com",
      passwordHash,
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  console.log("  ✓ Users created.");

  // ---------------------------------------------------------------------------
  // Business settings
  // ---------------------------------------------------------------------------
  await prisma.businessSettings.create({
    data: {
      businessName: "Acme Services Co.",
      timezone: "America/Chicago",
    },
  });
  console.log("  ✓ Business settings created.");

  // ---------------------------------------------------------------------------
  // Tags
  // ---------------------------------------------------------------------------
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: "VIP", color: "#8b5cf6" } }),
    prisma.tag.create({ data: { name: "Referral", color: "#10b981" } }),
    prisma.tag.create({ data: { name: "Seasonal", color: "#f59e0b" } }),
    prisma.tag.create({ data: { name: "Commercial", color: "#3b82f6" } }),
    prisma.tag.create({ data: { name: "Repeat", color: "#06b6d4" } }),
  ]);
  console.log("  ✓ Tags created.");

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  console.log("  Creating contacts...");

  const contact1 = await prisma.contact.create({
    data: {
      firstName: "Maria",
      lastName: "Gonzalez",
      displayName: "Maria Gonzalez",
      businessName: "Gonzalez Properties",
      email: "maria.gonzalez@example.com",
      phone: "555-0101",
      city: "Austin",
      state: "TX",
      zip: "78701",
      source: ContactSource.REFERRAL,
      stage: ContactStage.QUOTE_SENT,
      type: ContactType.LEAD,
      status: ContactStatus.ACTIVE,
      assignedUserId: owner.id,
      createdById: owner.id,
      lastContactedAt: twoDaysAgo,
      nextFollowUpAt: tomorrow,
      tags: { create: [{ tagId: tags[0].id }, { tagId: tags[1].id }] },
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      firstName: "David",
      lastName: "Chen",
      displayName: "David Chen",
      email: "david.chen@example.com",
      phone: "555-0102",
      city: "Austin",
      state: "TX",
      zip: "78702",
      source: ContactSource.WEBSITE_FORM,
      stage: ContactStage.NEW_LEAD,
      type: ContactType.LEAD,
      status: ContactStatus.ACTIVE,
      assignedUserId: staffMember1.id,
      createdById: owner.id,
      nextFollowUpAt: now,
      tags: { create: [{ tagId: tags[2].id }] },
    },
  });

  const contact3 = await prisma.contact.create({
    data: {
      firstName: "Emily",
      lastName: "Thompson",
      displayName: "Emily Thompson",
      businessName: "Thompson Realty Group",
      email: "emily@thompsonrealty.example.com",
      phone: "555-0103",
      city: "Round Rock",
      state: "TX",
      zip: "78664",
      source: ContactSource.GOOGLE,
      stage: ContactStage.BOOKED,
      type: ContactType.CUSTOMER,
      status: ContactStatus.ACTIVE,
      assignedUserId: owner.id,
      createdById: owner.id,
      customerSinceAt: threeDaysAgo,
      lastContactedAt: yesterday,
      nextFollowUpAt: nextWeek,
      tags: { create: [{ tagId: tags[3].id }, { tagId: tags[4].id }] },
    },
  });

  const contact4 = await prisma.contact.create({
    data: {
      firstName: "Marcus",
      lastName: "Williams",
      displayName: "Marcus Williams",
      email: "marcus.w@example.com",
      phone: "555-0104",
      city: "Cedar Park",
      state: "TX",
      zip: "78613",
      source: ContactSource.FACEBOOK,
      stage: ContactStage.CONTACTED,
      type: ContactType.LEAD,
      status: ContactStatus.ACTIVE,
      assignedUserId: staffMember1.id,
      createdById: staffMember1.id,
      lastContactedAt: threeDaysAgo,
      nextFollowUpAt: yesterday,
    },
  });

  const contact5 = await prisma.contact.create({
    data: {
      firstName: "Sarah",
      lastName: "Mitchell",
      displayName: "Sarah Mitchell",
      email: "smitchell@example.com",
      phone: "555-0105",
      city: "Austin",
      state: "TX",
      zip: "78748",
      source: ContactSource.INSTAGRAM,
      stage: ContactStage.WAITING_ON_RESPONSE,
      type: ContactType.LEAD,
      status: ContactStatus.ACTIVE,
      assignedUserId: staffMember2.id,
      createdById: owner.id,
      lastContactedAt: twoDaysAgo,
      nextFollowUpAt: tomorrow,
    },
  });

  const contact6 = await prisma.contact.create({
    data: {
      firstName: "Robert",
      lastName: "Patel",
      displayName: "Robert Patel",
      businessName: "Patel Commercial LLC",
      email: "robert@patelcommercial.example.com",
      phone: "555-0106",
      city: "Austin",
      state: "TX",
      zip: "78731",
      source: ContactSource.PHONE_CALL,
      stage: ContactStage.COMPLETED,
      type: ContactType.CUSTOMER,
      status: ContactStatus.ACTIVE,
      assignedUserId: owner.id,
      createdById: owner.id,
      customerSinceAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      lastContactedAt: twoDaysAgo,
      tags: { create: [{ tagId: tags[0].id }, { tagId: tags[3].id }] },
    },
  });

  await prisma.contact.create({
    data: {
      firstName: "Jessica",
      lastName: "Nguyen",
      displayName: "Jessica Nguyen",
      email: "jessica.nguyen@example.com",
      phone: "555-0107",
      city: "Austin",
      state: "TX",
      source: ContactSource.REPEAT_CUSTOMER,
      stage: ContactStage.QUOTE_REQUESTED,
      type: ContactType.CUSTOMER,
      status: ContactStatus.ACTIVE,
      assignedUserId: staffMember1.id,
      createdById: staffMember1.id,
      tags: { create: [{ tagId: tags[4].id }] },
    },
  });

  await prisma.contact.create({
    data: {
      firstName: "Michael",
      lastName: "Davis",
      displayName: "Michael Davis",
      phone: "555-0108",
      city: "Pflugerville",
      state: "TX",
      source: ContactSource.IN_PERSON,
      stage: ContactStage.LOST,
      type: ContactType.LEAD,
      status: ContactStatus.ACTIVE,
      assignedUserId: staffMember2.id,
      createdById: owner.id,
    },
  });

  console.log("  ✓ Contacts created.");

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------
  console.log("  Creating tasks...");

  await prisma.task.create({
    data: {
      title: "Follow up on quote",
      description: "Quote was sent 2 days ago. Check if they have questions.",
      dueAt: tomorrow,
      priority: TaskPriority.HIGH,
      status: TaskStatus.OPEN,
      assignedUserId: owner.id,
      contactId: contact1.id,
      createdById: owner.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Send estimate",
      description: "They asked for a ballpark during the call. Get numbers together.",
      dueAt: yesterday,
      priority: TaskPriority.URGENT,
      status: TaskStatus.OPEN,
      assignedUserId: staffMember1.id,
      contactId: contact4.id,
      createdById: staffMember1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Confirm appointment time",
      description: "Call to confirm the visit scheduled for next week.",
      dueAt: tomorrow,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.OPEN,
      assignedUserId: owner.id,
      contactId: contact3.id,
      createdById: owner.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Call back — left voicemail",
      dueAt: now,
      priority: TaskPriority.HIGH,
      status: TaskStatus.OPEN,
      assignedUserId: staffMember1.id,
      contactId: contact2.id,
      createdById: staffMember1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Ask for Google review",
      description: "Job completed. Send the review request link via text.",
      dueAt: twoDaysAgo,
      priority: TaskPriority.LOW,
      status: TaskStatus.COMPLETED,
      assignedUserId: owner.id,
      contactId: contact6.id,
      createdById: owner.id,
      completedAt: yesterday,
    },
  });

  console.log("  ✓ Tasks created.");

  // ---------------------------------------------------------------------------
  // Notes
  // ---------------------------------------------------------------------------
  console.log("  Creating notes...");

  await prisma.note.create({
    data: {
      contactId: contact1.id,
      authorId: owner.id,
      type: NoteType.CALL_LOG,
      content: "Spoke with Maria about the scope of work. She wants the full property done before end of month. Very interested. Quote sent via email.",
    },
  });

  await prisma.note.create({
    data: {
      contactId: contact1.id,
      authorId: owner.id,
      type: NoteType.QUOTE_NOTE,
      content: "Quote #Q-2024-0042 sent for $850. Follow up by Thursday if no response.",
    },
  });

  await prisma.note.create({
    data: {
      contactId: contact3.id,
      authorId: staffMember1.id,
      type: NoteType.MEETING_NOTE,
      content: "Walked the property with Emily. She has 3 units. Would like recurring monthly service if this first job goes well. Good opportunity.",
    },
  });

  await prisma.note.create({
    data: {
      contactId: contact6.id,
      authorId: owner.id,
      type: NoteType.GENERAL,
      content: "Job completed. Customer was very happy. Left 5-star review on Google. Good candidate for referral outreach.",
    },
  });

  console.log("  ✓ Notes created.");

  // ---------------------------------------------------------------------------
  // Quotes
  // ---------------------------------------------------------------------------
  console.log("  Creating quotes...");

  await prisma.quote.create({
    data: {
      contactId: contact1.id,
      title: "Full Property Service - Spring",
      amount: 850.00,
      description: "Full exterior service including pressure washing, window cleaning, and gutter clear.",
      status: QuoteStatus.SENT,
      sentAt: twoDaysAgo,
      followUpAt: tomorrow,
      createdById: owner.id,
    },
  });

  await prisma.quote.create({
    data: {
      contactId: contact5.id,
      title: "Backyard Patio & Driveway",
      amount: 425.00,
      description: "Pressure wash driveway and back patio. Remove moss from sidewalk.",
      status: QuoteStatus.WAITING_ON_RESPONSE,
      sentAt: threeDaysAgo,
      followUpAt: yesterday,
      createdById: staffMember2.id,
    },
  });

  await prisma.quote.create({
    data: {
      contactId: contact6.id,
      title: "Commercial Parking Lot - Q1",
      amount: 1200.00,
      description: "Full parking lot pressure wash. 3 visits over the quarter.",
      status: QuoteStatus.ACCEPTED,
      sentAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      createdById: owner.id,
    },
  });

  console.log("  ✓ Quotes created.");

  // ---------------------------------------------------------------------------
  // Appointments
  // ---------------------------------------------------------------------------
  console.log("  Creating appointments...");

  await prisma.appointment.create({
    data: {
      contactId: contact3.id,
      title: "Initial Service Visit - Thompson Property",
      type: AppointmentType.SERVICE_APPOINTMENT,
      startAt: nextWeek,
      endAt: new Date(nextWeek.getTime() + 3 * 60 * 60 * 1000),
      location: "123 Oak St, Round Rock, TX 78664",
      status: AppointmentStatus.CONFIRMED,
      assignedUserId: owner.id,
      notes: "Bring the surface cleaner attachment. Emily mentioned the driveway has heavy tire marks.",
    },
  });

  await prisma.appointment.create({
    data: {
      contactId: contact1.id,
      title: "Estimate Walk-Through",
      type: AppointmentType.ESTIMATE_VISIT,
      startAt: tomorrow,
      endAt: new Date(tomorrow.getTime() + 60 * 60 * 1000),
      location: "456 Elm Ave, Austin, TX 78701",
      status: AppointmentStatus.SCHEDULED,
      assignedUserId: staffMember1.id,
    },
  });

  console.log("  ✓ Appointments created.");

  // ---------------------------------------------------------------------------
  // Activities (auto-generated timeline events)
  // ---------------------------------------------------------------------------
  console.log("  Creating activity records...");

  const activityData = [
    {
      contactId: contact1.id,
      userId: owner.id,
      entityType: "contact",
      entityId: contact1.id,
      action: "contact.created",
      metadata: { stage: "NEW_LEAD" },
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      contactId: contact1.id,
      userId: owner.id,
      entityType: "contact",
      entityId: contact1.id,
      action: "stage.changed",
      metadata: { from: "NEW_LEAD", to: "CONTACTED" },
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      contactId: contact1.id,
      userId: owner.id,
      entityType: "contact",
      entityId: contact1.id,
      action: "stage.changed",
      metadata: { from: "CONTACTED", to: "QUOTE_SENT" },
      createdAt: twoDaysAgo,
    },
    {
      contactId: contact6.id,
      userId: owner.id,
      entityType: "contact",
      entityId: contact6.id,
      action: "stage.changed",
      metadata: { from: "BOOKED", to: "COMPLETED" },
      createdAt: twoDaysAgo,
    },
  ];

  for (const activity of activityData) {
    await prisma.activity.create({ data: activity });
  }

  console.log("  ✓ Activity records created.");

  // ---------------------------------------------------------------------------
  // Done
  // ---------------------------------------------------------------------------
  console.log("");
  console.log("✅ Seed complete!");
  console.log("");
  console.log("  Test accounts:");
  console.log("    Owner   → owner@example.com  / password123");
  console.log("    Staff 1 → sam@example.com    / password123");
  console.log("    Staff 2 → jordan@example.com / password123");
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
