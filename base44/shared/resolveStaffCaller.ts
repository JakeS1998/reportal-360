export async function resolveStaffCaller(base44, { callerUsername, callerPassword }) {
  if (!callerUsername) return null;
  const staff = await base44.asServiceRole.entities.Teacher.filter({
    username: callerUsername,
    password: callerPassword,
  });
  return staff[0] || null;
}