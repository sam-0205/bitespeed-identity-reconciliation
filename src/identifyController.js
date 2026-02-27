import { db } from "./db.js";

export const identifyContact = async (req, res) => {
  const { email, phoneNumber } = req.body;

  // ❌ Require at least one field
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber required" });
  }

  try {
    // 🟡 1️⃣ Build safe query based on provided fields
    let query = "SELECT * FROM Contact WHERE ";
    let params = [];

    if (email && phoneNumber) {
      query += "email = ? OR phoneNumber = ?";
      params = [email, phoneNumber];
    } else if (email) {
      query += "email = ?";
      params = [email];
    } else {
      query += "phoneNumber = ?";
      params = [phoneNumber];
    }

    const [matched] = await db.execute(query, params);

    // 🟢 2️⃣ CASE: No match → create PRIMARY
    if (matched.length === 0) {
      const [result] = await db.execute(
        `INSERT INTO Contact (email, phoneNumber, linkPrecedence)
         VALUES (?, ?, 'primary')`,
        [email || null, phoneNumber || null]
      );

      return res.json({
        contact: {
          primaryContactId: result.insertId,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // 🔵 3️⃣ Resolve true root primary for each matched contact
    const resolvePrimary = async (contact) => {
      let current = contact;
      while (current.linkedId) {
        const [[parent]] = await db.execute(
          `SELECT * FROM Contact WHERE id = ?`,
          [current.linkedId]
        );
        current = parent;
      }
      return current;
    };

    const primaryMap = new Map();

    for (const contact of matched) {
      const root = await resolvePrimary(contact);
      primaryMap.set(root.id, root);
    }

    let primaries = Array.from(primaryMap.values());

    // 🔴 4️⃣ MERGE if multiple primaries
    primaries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const truePrimary = primaries[0];

    if (primaries.length > 1) {
      const otherPrimaryIds = primaries.slice(1).map(p => p.id);

      await db.execute(
        `UPDATE Contact
         SET linkPrecedence='secondary', linkedId=?
         WHERE id IN (${otherPrimaryIds.map(() => "?").join(",")})`,
        [truePrimary.id, ...otherPrimaryIds]
      );
    }

    // 🟣 5️⃣ Insert new secondary if exact combination does NOT exist
    const comboExists = matched.some(
      c => c.email === email && c.phoneNumber === phoneNumber
    );

    if (!comboExists) {
      await db.execute(
        `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence)
         VALUES (?, ?, ?, 'secondary')`,
        [email || null, phoneNumber || null, truePrimary.id]
      );
    }

    // 🟠 6️⃣ Fetch FULL cluster (handles transitive links)
    const [cluster] = await db.execute(
      `SELECT * FROM Contact
       WHERE id = ?
          OR linkedId = ?
          OR linkedId IN (SELECT id FROM Contact WHERE linkedId = ?)`,
      [truePrimary.id, truePrimary.id, truePrimary.id]
    );

    // 🟢 7️⃣ Consolidate data
    const emails = [...new Set(cluster.map(c => c.email).filter(Boolean))];
    const phones = [...new Set(cluster.map(c => c.phoneNumber).filter(Boolean))];
    const secondaryIds = cluster
      .filter(c => c.id !== truePrimary.id)
      .map(c => c.id);

    // 🟢 8️⃣ Response
    return res.json({
      contact: {
        primaryContactId: truePrimary.id,
        emails,
        phoneNumbers: phones,
        secondaryContactIds: secondaryIds,
      },
    });

  } catch (err) {
    console.error("❌ Identify Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};