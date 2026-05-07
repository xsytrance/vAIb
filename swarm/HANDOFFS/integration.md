# Handoff: Integration Agent

## Role
Android-backend integration, API client, repository layer, polling, fallback handling.

## Current Status

- [ ] API client created
- [ ] Repository layer implemented
- [ ] Polling strategy defined
- [ ] Fallback mode working
- [ ] Error handling complete
- [ ] Handoff complete

## Dependencies

| Dependency | Source | Status |
|------------|--------|--------|
| API shape | backend-agent | Pending |
| Android project | android-agent | Pending |
| Data models | architect-agent | Pending |

## API Client

### VaibApiClient.kt

```kotlin
// Planned structure
interface VaibApi {
    @GET("api/queue")
    suspend fun getQueue(): List<Track>

    @GET("api/agents")
    suspend fun getAgents(): List<Agent>

    @GET("api/events")
    suspend fun getEvents(): List<Event>

    @GET("api/stats")
    suspend fun getStats(): StatsSummary

    @POST("api/queue")
    suspend fun addTrack(@Body track: Track): Track

    @POST("api/agents/{id}/react")
    suspend fun postReaction(@Path("id") id: String, @Body reaction: Reaction): Reaction
}
```

### VaibRepository.kt

```kotlin
// Planned structure
class VaibRepository @Inject constructor(
    private val api: VaibApi,
    private val cache: LocalCache
) {
    // Polling-based data refresh
    // Fallback to cache when offline
    // Error state management
}
```

## Polling Strategy

| Data Type | Poll Interval | Cache Duration | Fallback |
|-----------|--------------|----------------|----------|
| Queue | 5 seconds | 30 seconds | Show cached |
| Agents | 10 seconds | 60 seconds | Show cached |
| Events | 3 seconds | 15 seconds | Show cached |
| Stats | 30 seconds | 5 minutes | Show cached |

## Fallback Mode

When backend is unreachable:
1. Serve data from local cache
2. Show "offline" indicator in UI
3. Queue mutations locally, sync when reconnected
4. Disable agent actions that require server

## Error Handling

| Error | Behavior |
|-------|----------|
| Network timeout | Retry 3x with backoff, then fallback |
| 404 Not Found | Log error, show empty state |
| 500 Server Error | Show error banner, use cache |
| Malformed JSON | Log error, skip update |

## Files Owned

| File | Purpose | Status |
|------|---------|--------|
| `VaibApiClient.kt` | Retrofit API interface | Pending |
| `VaibRepository.kt` | Repository pattern implementation | Pending |
| `LocalCache.kt` | Local data cache | Pending |
| `NetworkMonitor.kt` | Connectivity monitoring | Pending |

## Open Questions

1. WebSocket instead of polling?
2. Background sync strategy?
3. Conflict resolution for offline changes?

## Handoff Notes

<!-- What other agents need to know about integration layer -->

## Report

See `swarm/REPORTS/integration-report.md` for full progress report.
