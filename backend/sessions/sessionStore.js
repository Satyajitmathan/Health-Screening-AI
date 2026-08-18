const sessions = new Map();

export const createSession = (sessionId) => {
  const session = {
    id: sessionId,

    collectedFields: {
      name: null,
      mainConcern: null,
      duration: null,
      severity: null,
      relatedSymptoms: null,
    },

    sessionHistory: [],

    status: "active",
  };

  sessions.set(sessionId, session);

  return session;
};

export const getSession = (sessionId) => {
  return sessions.get(sessionId);
};

export const deleteSession = (sessionId) => {
  sessions.delete(sessionId);
};

export const updateSession = (sessionId, updates) => {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  Object.assign(session, updates);

  return session;
};

export const addMessage = (sessionId, message) => {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  session.sessionHistory.push(message);

  return session;
};

export const getAllSessions = () => {
  return sessions;
};