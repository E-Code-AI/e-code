# Database Architecture Guide

## Executive Summary: Neon vs Replit DB Decision

**Recommendation: Use Neon PostgreSQL as the primary database**

The E-Code platform is already architected around **Neon PostgreSQL** and should continue using it as the primary database. This document explains the reasoning and provides guidance on the hybrid approach currently implemented.

## Current Database Architecture

### Primary Database: Neon PostgreSQL
- **Location**: `server/db.ts`
- **ORM**: Drizzle ORM with `drizzle-orm/postgres-js`
- **Schema**: Comprehensive relational schema in `shared/schema.ts`
- **Connection**: Serverless PostgreSQL via `@neondatabase/serverless`

### Secondary Database: ReplitDB Emulation
- **Location**: `server/database/replitdb.ts`
- **Type**: File-based key-value store
- **Purpose**: Replit compatibility and simple key-value operations
- **Storage**: Local JSON files in `.replitdb/` directory

## Database Comparison Matrix

| Feature | Neon PostgreSQL | Replit DB | Recommendation |
|---------|----------------|-----------|----------------|
| **Data Structure** | Relational tables with complex joins | Key-value pairs | Use Neon for complex data |
| **Scalability** | Horizontal & vertical scaling | Limited by local storage | Use Neon for scale |
| **Performance** | Optimized queries, indexing | Fast for simple operations | Use Neon for complex queries |
| **Backup & Recovery** | Automated backups, point-in-time recovery | Manual file backup | Use Neon for reliability |
| **ACID Compliance** | Full ACID transactions | No transaction support | Use Neon for data integrity |
| **Multi-user Support** | Concurrent connections with locking | File-based limitations | Use Neon for collaboration |
| **Security** | Enterprise-grade security | Local file permissions | Use Neon for security |
| **Cost** | Usage-based pricing | Included in hosting | Consider usage patterns |
| **Simplicity** | Requires SQL knowledge | Simple key-value API | Use ReplitDB for simple cases |

## When to Use Each Database

### Use Neon PostgreSQL for:
- ✅ **User management and authentication**
- ✅ **Project data and file management**
- ✅ **Collaboration features (comments, reviews)**
- ✅ **Billing and usage tracking**
- ✅ **Analytics and reporting**
- ✅ **Complex relationships and joins**
- ✅ **Production applications**
- ✅ **Data that requires ACID compliance**

### Use ReplitDB Emulation for:
- ✅ **Simple project-specific settings**
- ✅ **Temporary cache data**
- ✅ **User preferences**
- ✅ **Session data (non-critical)**
- ✅ **Development/testing key-value needs**
- ✅ **Replit compatibility layer**

## Current Implementation Details

### Neon Configuration
```typescript
// server/db.ts
export const client = postgres(process.env.DATABASE_URL, {
  max: 20, // Connection pool size
  idle_timeout: 60,
  max_lifetime: 60 * 60,
  connect_timeout: 10,
  prepare: false,
  transform: { undefined: null },
  onnotice: () => {},
  debug: process.env.NODE_ENV === 'development',
});
```

### Database Schema Highlights
- **Users**: Complete user management with authentication
- **Projects**: Project structure with files and collaboration
- **Teams**: Multi-user team functionality
- **Billing**: Usage tracking and subscription management
- **AI**: Conversation history and usage tracking
- **Deployments**: Full deployment lifecycle management

### ReplitDB Emulation API
```typescript
// Available methods
await replitDB.get(projectId, key)
await replitDB.set(projectId, key, value)
await replitDB.delete(projectId, key)
await replitDB.keys(projectId, prefix?)
await replitDB.clear(projectId)
```

## Migration Strategy

### If Currently Using Replit DB
1. **Audit your data usage**
   - Identify what data is stored in Replit DB
   - Categorize by complexity and relationships

2. **Plan the migration**
   - Simple key-value data → Keep in ReplitDB emulation
   - Complex relational data → Migrate to PostgreSQL

3. **Implementation steps**
   ```bash
   # 1. Export existing data
   npm run export-replit-data
   
   # 2. Transform data for PostgreSQL
   npm run transform-data
   
   # 3. Import to PostgreSQL
   npm run import-to-postgres
   ```

### Setting Up Neon
1. **Create Neon Project**
   - Visit [neon.tech](https://neon.tech)
   - Create new project
   - Copy connection string

2. **Update Environment**
   ```bash
   # .env
   DATABASE_URL=postgresql://user:pass@host.neon.tech:5432/dbname
   ```

3. **Initialize Schema**
   ```bash
   npm run db:push
   ```

## Performance Optimization

### PostgreSQL Best Practices
- Use connection pooling (already configured)
- Implement proper indexing for queries
- Use prepared statements when appropriate
- Monitor query performance

### ReplitDB Best Practices
- Keep data size small (< 1MB per project)
- Use for ephemeral data only
- Regular cleanup of old data
- Avoid complex nested objects

## Security Considerations

### PostgreSQL Security
- Connection string encryption
- Row-level security policies
- Database user permissions
- Network security (SSL/TLS)

### ReplitDB Security
- File system permissions
- No sensitive data storage
- Regular backup considerations
- Access control at application level

## Monitoring and Maintenance

### Database Health Checks
```typescript
// Check Neon connection
await db.execute(sql`SELECT 1`);

// Check ReplitDB
await replitDB.get(1, 'health-check');
```

### Key Metrics to Monitor
- Connection pool utilization
- Query performance
- Storage usage
- Error rates
- Backup status

## Cost Optimization

### Neon Cost Factors
- Compute hours
- Storage usage
- Data transfer
- Number of branches

### Optimization Strategies
- Use connection pooling
- Implement query caching
- Regular data cleanup
- Monitor usage patterns

## Conclusion

**The E-Code platform should continue using Neon PostgreSQL as its primary database** while maintaining the ReplitDB emulation for simple key-value operations. This hybrid approach provides:

1. **Enterprise-grade reliability** for critical data
2. **Simple API compatibility** for basic operations
3. **Scalability** for growing user base
4. **Data integrity** for collaborative features
5. **Cost efficiency** through proper usage patterns

The current architecture is well-designed and production-ready. Focus should be on optimization and monitoring rather than changing the fundamental database choice.