export const getErrorMessage = (error: unknown, fallbackMessage = 'Unknown error'): string => {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;

    if (Array.isArray(errorObj['messages'])) {
      return errorObj['messages'].join(', ');
    }

    const messageProperties = ['message', 'error', 'err', 'errorMessage', 'errorMsg'];

    for (const prop of messageProperties) {
      if (typeof errorObj[prop] === 'string') {
        return errorObj[prop] as string;
      }
    }

    // check for any enumerable properties
    const properties = Object.keys(errorObj);

    if (properties.length > 0) {
      try {
        return JSON.stringify(errorObj);
      } catch {
        return fallbackMessage;
      }
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return fallbackMessage;
  }
};
