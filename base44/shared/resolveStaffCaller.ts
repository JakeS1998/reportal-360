export async function resolveStaffCaller(base44, { callerUsername, callerPassword, callerEmail, callerSso }) {
  if (callerSso && callerEmail) {
    const staff = await base44.asServiceRole.entities.Teacher.filter({}, "-created_date", 500);
    const normalizedEmail = callerEmail.trim().toLowerCase();
    return staff.find((teacher) => teacher.email?.trim().toLowerCase() === normalizedEmail) || null;
  }

  if (!callerUsername) return null;
  const staff = await base44.asServiceRole.entities.Teacher.filter({
    username: callerUsername,
    password: callerPassword,
  });
  return staff[0] || null;
}