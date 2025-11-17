# Newsfeed Implementation - Fix Guide

## Overview

This guide provides step-by-step fixes for all 10 bugs found in the GraphQL newsfeed implementation.

---

## Fix #1: GraphQL Query Syntax

### Current (Broken)
```typescript
const query = `
  query GetNews($where: NewsfeedpostWhereInput, $limit: Int, $page: Int) {
    Newsfeedposts(where: $where, limit: $limit, page: $page, sort: "-publish_date") {
      docs { id title content publish_date status priority createdAt updatedAt }
      totalDocs
      totalPages
      page
      hasNextPage
      hasPrevPage
    }
  }
`;
```

### Fixed
```typescript
const query = `
  query GetNews($limit: Int, $offset: Int) {
    newsfeedposts(limit: $limit, offset: $offset, orderBy: {publishDate: DESC}) {
      edges {
        node {
          id
          title
          content
          publishDate
          status
          priority
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
      }
    }
  }
`;
```

### Changes
- ✅ Removed invalid `where` parameter
- ✅ Changed `Newsfeedposts` to `newsfeedposts` (lowercase)
- ✅ Fixed sort syntax to `orderBy: {publishDate: DESC}`
- ✅ Changed `page` to `offset` calculation
- ✅ Updated response structure to use `edges` and `pageInfo`

---

## Fix #2: Variable Mapping

### Current (Broken)
```typescript
const variables = {
  where: {
    status: { equals: "Published" },
    publish_date: { less_than_equal: new Date().toISOString() }
  },
  limit,
  page
};
```

### Fixed
```typescript
const variables = {
  limit,
  offset: (page - 1) * limit,
  filters: {
    status: "Published",
    publishDate: { lte: new Date().toISOString() }
  }
};
```

### Changes
- ✅ Removed `where` object
- ✅ Changed `page` to `offset` calculation
- ✅ Fixed field names to camelCase
- ✅ Simplified filter operators

---

## Fix #3: ID Conversion

### Current (Broken)
```typescript
id: Number.isFinite(Number(d.id)) ? Number(d.id) : i,
```

### Fixed
```typescript
// Validate ID exists
if (!d.id) {
  console.error('Post missing ID:', d);
  continue; // Skip invalid posts
}

id: Number(d.id),
```

### Changes
- ✅ Validate ID exists before conversion
- ✅ Skip invalid posts instead of using index
- ✅ Add error logging
- ✅ Prevent duplicate keys

---

## Fix #4: Error Handling

### Current (Broken)
```typescript
} catch {
  const restRes = await fetch(`${adminUrl}/api/news?...`);
  if (!restRes.ok) {
    const text = await restRes.text().catch(() => "");
    return res.status(502).json({ error: "Failed to fetch news", details: text });
  }
  // ...
}
```

### Fixed
```typescript
} catch (gqlError) {
  console.error('GraphQL newsfeed query failed:', {
    error: gqlError instanceof Error ? gqlError.message : String(gqlError),
    url: `${adminUrl}/api/graphql`,
    query: query.substring(0, 100) + '...'
  });
  
  // Only fallback for network errors
  if (gqlError instanceof TypeError && gqlError.message.includes('fetch')) {
    console.warn('GraphQL service unavailable, attempting REST fallback');
    try {
      const restRes = await fetch(`${adminUrl}/api/news?limit=${limit}&page=${page}`);
      if (!restRes.ok) {
        throw new Error(`REST API returned ${restRes.status}`);
      }
      const restJson = await restRes.json();
      const docs = Array.isArray(restJson?.data) ? restJson.data : [];
      posts = docs.map((d: any) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        publish_date: d.publish_date,
        status: d.status,
        priority: d.priority,
        created_at: d.created_at || d.createdAt,
        updated_at: d.updated_at || d.updatedAt,
      }));
    } catch (restError) {
      console.error('REST fallback also failed:', restError);
      throw new Error('Both GraphQL and REST newsfeed services unavailable');
    }
  } else {
    // Re-throw other errors
    throw gqlError;
  }
}
```

### Changes
- ✅ Log detailed error information
- ✅ Only fallback for network errors
- ✅ Add error context
- ✅ Proper error propagation

---

## Fix #5: GraphQL Response Validation

### Current (Broken)
```typescript
if (gqlRes.ok) {
  const gqlJson = await gqlRes.json();
  const docs = gqlJson?.data?.Newsfeedposts?.docs ?? [];
  posts = docs.map((d: any, i: number) => ({
    // ...
  }));
} else {
  throw new Error(`GraphQL ${gqlRes.status}`);
}
```

### Fixed
```typescript
if (gqlRes.ok) {
  const gqlJson = await gqlRes.json();
  
  // Check for GraphQL errors
  if (gqlJson.errors && Array.isArray(gqlJson.errors) && gqlJson.errors.length > 0) {
    const errorMsg = gqlJson.errors.map((e: any) => e.message).join('; ');
    console.error('GraphQL returned errors:', errorMsg);
    throw new Error(`GraphQL error: ${errorMsg}`);
  }
  
  // Validate data structure
  if (!gqlJson.data) {
    throw new Error('GraphQL response missing data field');
  }
  
  if (!gqlJson.data.newsfeedposts) {
    throw new Error('GraphQL response missing newsfeedposts field');
  }
  
  if (!Array.isArray(gqlJson.data.newsfeedposts.edges)) {
    throw new Error('GraphQL response edges is not an array');
  }
  
  const docs = gqlJson.data.newsfeedposts.edges
    .map((edge: any) => edge.node)
    .filter((node: any) => node && node.id);
  
  posts = docs.map((d: any) => ({
    id: Number(d.id),
    title: String(d.title || ''),
    content: d.content,
    publish_date: String(d.publishDate || ''),
    status: String(d.status || 'Draft'),
    priority: String(d.priority || 'Normal'),
    created_at: String(d.createdAt || new Date().toISOString()),
    updated_at: String(d.updatedAt || new Date().toISOString()),
  }));
} else {
  throw new Error(`GraphQL HTTP error: ${gqlRes.status} ${gqlRes.statusText}`);
}
```

### Changes
- ✅ Check for GraphQL errors in response
- ✅ Validate response structure
- ✅ Type coercion for safety
- ✅ Filter out invalid posts
- ✅ Better error messages

---

## Fix #6: Field Naming Consistency

### Current (Broken)
```typescript
created_at: d.createdAt ?? d.created_at,
updated_at: d.updatedAt ?? d.updated_at,
```

### Fixed
```typescript
// Normalize to snake_case (database convention)
created_at: d.created_at || d.createdAt || new Date().toISOString(),
updated_at: d.updated_at || d.updatedAt || new Date().toISOString(),
```

### Changes
- ✅ Check snake_case first (database convention)
- ✅ Provide fallback dates
- ✅ Consistent naming

---

## Fix #7: Input Validation

### Current (Broken)
```typescript
const limit = parseInt(q.limit || "10", 10);
const page = parseInt(q.page || "1", 10);
```

### Fixed
```typescript
// Validate and sanitize inputs
const rawLimit = parseInt(q.limit || "10", 10);
const rawPage = parseInt(q.page || "1", 10);

const limit = Math.min(Math.max(rawLimit, 1), 100); // 1-100
const page = Math.max(rawPage, 1); // Minimum 1

// Log suspicious requests
if (rawLimit > 100 || rawLimit < 1) {
  console.warn(`Suspicious limit requested: ${rawLimit}`);
}
if (rawPage < 1) {
  console.warn(`Suspicious page requested: ${rawPage}`);
}
```

### Changes
- ✅ Enforce minimum and maximum limits
- ✅ Prevent negative values
- ✅ Log suspicious requests
- ✅ Prevent DoS attacks

---

## Fix #8: Content Sanitization

### Current (Broken)
```typescript
const renderPostContent = (content: any) => {
  if (typeof content === 'string') {
    return content;
  }
  if (content && typeof content === 'object') {
    return content.text || content.content || JSON.stringify(content);
  }
  return 'No content available';
};
```

### Fixed
```typescript
import DOMPurify from 'isomorphic-dompurify';

const renderPostContent = (content: any) => {
  try {
    let text = '';
    
    if (typeof content === 'string') {
      text = content;
    } else if (content && typeof content === 'object') {
      text = content.text || content.content || '';
    }
    
    if (!text) {
      return 'No content available';
    }
    
    // Sanitize HTML
    const sanitized = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
      ALLOWED_ATTR: ['href', 'target']
    });
    
    // Limit length
    const maxLength = 500;
    if (sanitized.length > maxLength) {
      return sanitized.substring(0, maxLength) + '...';
    }
    
    return sanitized;
  } catch (error) {
    console.error('Error rendering post content:', error);
    return 'Error displaying content';
  }
};
```

### Changes
- ✅ Sanitize HTML to prevent XSS
- ✅ Limit content length
- ✅ Error handling
- ✅ Whitelist allowed tags

---

## Fix #9: Dynamic Payout Date

### Current (Broken)
```typescript
nextPayoutDate: 'March 15, 2025'
```

### Fixed
```typescript
// Get from statistics API
const nextPayoutDate = statsResponse?.data?.nextPayoutDate 
  ? new Date(statsResponse.data.nextPayoutDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  : 'TBD';

const fundStats = {
  totalRevenue: statsResponse?.data?.totalRevenue || 0,
  totalMembers: statsResponse?.data?.totalMembers || 0,
  potentialWinners: statsResponse?.data?.activeMembers || 0,
  nextPayoutDate
};
```

### Changes
- ✅ Get date from API
- ✅ Format dynamically
- ✅ Fallback to 'TBD'
- ✅ Always current

---

## Fix #10: Skeleton Loading

### Current (Broken)
```typescript
{isLoadingNews ? (
  <div className="py-4 text-center text-muted-foreground">Loading...</div>
) : (newsResponse?.posts || []).slice(0,3).length === 0 ? (
```

### Fixed
```typescript
{isLoadingNews ? (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    ))}
  </div>
) : (newsResponse?.posts || []).slice(0,3).length === 0 ? (
```

### Changes
- ✅ Use Skeleton component
- ✅ Match actual layout
- ✅ Better UX
- ✅ Consistent with other sections

---

## Implementation Checklist

- [ ] Fix GraphQL query syntax
- [ ] Fix variable mapping
- [ ] Fix ID conversion
- [ ] Improve error handling
- [ ] Add response validation
- [ ] Standardize field naming
- [ ] Add input validation
- [ ] Sanitize content
- [ ] Use dynamic payout date
- [ ] Add skeleton loading
- [ ] Test all fixes
- [ ] Deploy to staging
- [ ] Monitor for errors
- [ ] Deploy to production

---

## Testing After Fixes

```bash
# Test 1: Valid request
curl "http://localhost:3000/api/newsfeed/posts"

# Test 2: With pagination
curl "http://localhost:3000/api/newsfeed/posts?limit=5&page=2"

# Test 3: Invalid limit (should be capped)
curl "http://localhost:3000/api/newsfeed/posts?limit=999"

# Test 4: Negative page (should default to 1)
curl "http://localhost:3000/api/newsfeed/posts?page=-1"

# Test 5: Check response structure
curl "http://localhost:3000/api/newsfeed/posts" | jq '.posts[0]'
```

---

## Deployment Steps

1. Create feature branch: `git checkout -b fix/newsfeed-bugs`
2. Apply all fixes
3. Run tests: `npm test`
4. Deploy to staging
5. Monitor logs for errors
6. Deploy to production
7. Monitor production logs

---

## Monitoring

After deployment, monitor:
- Error rates in `/api/newsfeed/posts`
- GraphQL query performance
- Response times
- Failed requests
- User feedback

---

## Conclusion

All 10 bugs can be fixed with the changes outlined above. The fixes address:
- ✅ GraphQL syntax issues
- ✅ Data validation
- ✅ Error handling
- ✅ Security concerns
- ✅ User experience
