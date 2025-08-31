# Valkey Service Guide

This guide explains how to use the Valkey service for caching and data storage in your Express application.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [Integration with Controllers](#integration-with-controllers)
- [Example with User Controller](#example-with-user-controller)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)

## Installation

The Valkey service is already set up in your project. Make sure you have the following environment variables in your `.env` file:

```env
VALKEY_HOST=127.0.0.1
VALKEY_PORT=6379
VALKEY_TLS=false  # Set to 'true' for TLS connections
VALKEY_USERNAME=  # Optional
VALKEY_PASSWORD=  # Optional
USER_CACHE_TTL=300  # 5 minutes
```

## Configuration

The service is pre-configured with sensible defaults. You can customize it by passing options when creating a store:

```typescript
const userStore = await ValkeyGlideStore.createFromEnv(userSchema, {
  prefix: 'user:',
  defaultTTLSeconds: 300, // 5 minutes
  schemaVersion: 1,
  throwOnParse: true, // throw if schema.parse fails on get
  deleteCorrupt: true, // delete keys that fail parse on get
});
```

## Basic Usage

### Creating a Store

```typescript
import { ValkeyGlideStore } from './services/valkey';
import { z } from 'zod';

// Define your schema using Zod
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create a store for users
const userStore = await ValkeyGlideStore.createFromEnv(userSchema, {
  prefix: 'user:',
  defaultTTLSeconds: Number(env.USER_CACHE_TTL) || 300, // 5 minutes default
});
```

### Basic Operations

```typescript
// Set a value with TTL
await userStore.set('user:123', {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Get a value
const user = await userStore.get('user:123');

// Delete a value
await userStore.del('user:123');

// Check if key exists
const exists = await userStore.exists('user:123');
```

## Integration with Controllers

### Example with User Controller

Here's how to integrate Valkey with your user controller for caching:

```typescript
// user.controller.ts
import { userStore } from "@/services/valkey-store";
import { createLogger } from "@/services/logger";

const logger = createLogger("UserController");

export const userController = {
  getUser: async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    logger.info("Fetching user", { userId: id });

    try {
      // Try to get from cache first
      const cachedUser = await userStore.get(id);
      if (cachedUser) {
        logger.debug("Cache hit", { userId: id });
        return sendSuccess(res, transformUser(cachedUser));
      }
      
      logger.debug("Cache miss, querying database", { userId: id });

      // If not in cache, fetch from database
      const { data: userData, error } = await tryCatch(
        db
          .select({
            id: user.id,
            name: user.name,
            age: user.age,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })
          .from(user)
          .where(eq(user.id, id))
      );

      if (error) {
        logger.error("Database error when fetching user", { userId: id, error });
        throw new Error(error.message);
      }

      if (!userData || userData.length === 0) {
        logger.warn("User not found", { userId: id });
        return sendError(res, "User not found", "USER_NOT_FOUND", 404);
      }

      const dbUser = userData[0];
      const userResponse = transformUser(dbUser);

      // Cache the user data
      const { id: _, ...userDataToCache } = userResponse;
      await userStore.set(id, userDataToCache);
      logger.debug("Cached user", { userId: id });

      return sendSuccess(res, userResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch user";
      logger.error("Error fetching user", { userId: id, error: errorMessage });
      return sendError(res, errorMessage, "FETCH_USER_FAILED", 400);
    }
  },

  updateUser: async (req: AuthedRequest<{ id: string }, {}, UpdateUserInput>, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;
    
    try {
      // Update in database
      const { data: updatedUser, error } = await tryCatch(
        db.update(user)
          .set(updateData)
          .where(eq(user.id, id))
          .returning()
      );

      if (error) {
        logger.error("Error updating user", { userId: id, error });
        throw new Error(error.message);
      }
      
      // Invalidate cache after successful update
      await userStore.del(id);
      logger.debug("Invalidated user cache", { userId: id });
      
      return sendSuccess(res, transformUser(updatedUser[0]));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update user";
      logger.error("Error updating user", { userId: id, error: errorMessage });
      return sendError(res, errorMessage, "UPDATE_USER_FAILED", 400);
    }
  }
};

// Helper function to transform database user to response format
const transformUser = (dbUser: any) => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  age: dbUser.age,
  createdAt: dbUser.createdAt,
  updatedAt: dbUser.updatedAt,
});
```

## Best Practices

1. **Cache Invalidation**: 
   - Always invalidate cache when data is updated or deleted
   - Use appropriate TTL to prevent stale data
   - Consider using cache tags for complex invalidation scenarios

2. **Error Handling**:
   - Always wrap Valkey operations in try-catch blocks
   - Log errors with sufficient context for debugging
   - Implement fallback mechanisms for cache misses

3. **Performance**:
   - Use appropriate TTL values based on data volatility
   - Consider using pipeline for multiple operations
   - Monitor cache hit/miss ratios

4. **Security**:
   - Validate all data before storing in cache
   - Use proper authentication for Valkey connections
   - Consider using TLS for production environments

## Error Handling

The Valkey service provides robust error handling:

```typescript
try {
  const user = await userStore.get('user:123');
  if (!user) {
    // Handle cache miss
    logger.debug('User not found in cache');
  }
} catch (error) {
  if (error instanceof ZodError) {
    // Handle schema validation errors
    logger.error('Schema validation failed', { error });
  } else if (error instanceof ConnectionError) {
    // Handle connection errors
    logger.error('Failed to connect to Valkey', { error });
  } else {
    // Handle other errors
    logger.error('Unexpected error', { error });
  }
  // Fallback to database or return error response
}
```

## Advanced Usage

### Using with Express Middleware

The Valkey store can be attached to the Express app locals for easy access in routes:

```typescript
// app.ts
import { createValkeyStore } from './services/valkey';

const app = express();

// Initialize Valkey store
const userStore = await createValkeyStore('user');

// Attach to app locals
app.locals.userStore = userStore;

// In your routes:
router.get('/users/:id', (req, res) => {
  const { userStore } = req.app.locals;
  // Use userStore
});
```

### Logging and Monitoring

The service includes built-in logging:

```typescript
// Enable debug logging for Valkey operations
const logger = createLogger('Valkey');

// Log cache hits/misses
logger.debug('Cache operation', { 
  operation: 'get', 
  key: 'user:123',
  hit: user !== null 
});
```

### Rate Limiting

Implement rate limiting using Valkey's atomic operations:

```typescript
// rate-limit.middleware.ts
const RATE_LIMIT = 100; // requests
const WINDOW_SIZE = 15 * 60; // 15 minutes in seconds

export const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const key = `rate-limit:${ip}`;
  
  try {
    const current = await rateLimitStore.get(key) || 0;
    if (current >= RATE_LIMIT) {
      return sendError(res, 'Too many requests', 'RATE_LIMIT_EXCEEDED', 429);
    }
    
    await rateLimitStore.set(key, current + 1, { ttlSeconds: WINDOW_SIZE });
    next();
  } catch (error) {
    // If Redis is down, allow the request but log the error
    logger.error('Rate limit error', { error });
    next();
  }
};
```
  next();
};
```

## Testing

When testing your application, you can mock the Valkey store or use a test instance of Valkey. Here's an example using Jest:

```typescript
// __tests__/user.controller.test.ts
import { userController } from '../user.controller';
import { userStore } from '../../services/valkey';

jest.mock('../../services/valkey');

describe('User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return user from cache if available', async () => {
      const mockUser = { id: '123', name: 'Test User', email: 'test@example.com' };
      (userStore.get as jest.Mock).mockResolvedValue(mockUser);
      
      // ... test implementation ...
    });
  });
});
```

## Conclusion

The Valkey service provides a powerful way to add caching and data storage to your Express application. By following the patterns and best practices outlined in this guide, you can significantly improve your application's performance and scalability.
