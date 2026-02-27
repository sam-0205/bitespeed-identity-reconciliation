import { db } from "./db.js";

export const identifyContact = async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber required" });
  }

  try {
    // 1️⃣ Find matching contacts
    const [contacts] = await db.execute(
      `SELECT * FROM Contact 
       WHERE email = ? OR phoneNumber = ?`,
      [email, phoneNumber]
    );

    // 🟢 CASE 1: No contacts found → create primary
    if (contacts.length === 0) {
      const [result] = await db.execute(
        `INSERT INTO Contact (email, phoneNumber, linkPrecedence)
         VALUES (?, ?, 'primary')`,
        [email, phoneNumber]
      );

      return res.json({
        contact: {
          primaryContactId: result.insertId,
          emails: [email],
          phoneNumbers: [phoneNumber],
          secondaryContactIds: [],
        },
      });
    }

    // 2️⃣ Find primary contact (oldest)
    let primary = contacts.find(c => c.linkPrecedence === "primary");

    if (!primary) {
      primary = contacts.sort((a, b) => a.createdAt - b.createdAt)[0];
    }

    // 3️⃣ Check if new info needs a secondary
    const emailExists = contacts.some(c => c.email === email);
    const phoneExists = contacts.some(c => c.phoneNumber === phoneNumber);

    if (!emailExists || !phoneExists) {
      await db.execute(
        `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence)
         VALUES (?, ?, ?, 'secondary')`,
        [email, phoneNumber, primary.id]
      );
    }

    // 4️⃣ Fetch all linked contacts
    const [allContacts] = await db.execute(
      `SELECT * FROM Contact 
       WHERE id = ? OR linkedId = ?`,
      [primary.id, primary.id]
    );

    const emails = [...new Set(allContacts.map(c => c.email).filter(Boolean))];
    const phones = [...new Set(allContacts.map(c => c.phoneNumber).filter(Boolean))];
    const secondaryIds = allContacts
      .filter(c => c.linkPrecedence === "secondary")
      .map(c => c.id);

    // 5️⃣ Response
    res.json({
      contact: {
        primaryContactId: primary.id,
        emails,
        phoneNumbers: phones,
        secondaryContactIds: secondaryIds,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};