import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';
import { SocketProvider, useSocket } from './SocketProvider';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';
import * as fc from 'fast-check';

// Mock dependencies
vi.mock('../store/authStore');
vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        channel: vi.fn(),
        removeChannel: vi.fn(),
    },
}));

/**
 * Bug Condition Exploration Test for Realtime Presence Status
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 * 
 * This test explores the bug condition where presence state changes fail to propagate
 * to connected clients. It simulates various presence events (join, leave, sync) and
 * status updates (track calls) to surface counterexamples that demonstrate the bug.
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code - failure confirms the bug exists.
 * **DO NOT attempt to fix the test or the code when it fails.**
 * 
 * The test encodes the expected behavior:
 * - When User A calls socket.track({ status: 'typing' }), User B's partnerStatus[userA.id] should update to 'typing' within 1-2 seconds
 * - When User A joins the presence channel, User B's partnerStatus[userA.id] should update to 'online'
 * - When User A leaves the presence channel, User B's partnerStatus[userA.id] should update to 'offline'
 */

// Test component to access socket context
function TestComponent({ onStatusUpdate }: { onStatusUpdate: (status: any) => void }) {
    const { socket, partnerStatus } = useSocket();

    // Report status updates to test
    React.useEffect(() => {
        onStatusUpdate({ socket, partnerStatus });
    }, [partnerStatus, socket, onStatusUpdate]);

    return null;
}

describe('Bug Condition Exploration: Presence State Synchronization', () => {
    let mockChannel: any;
    let presenceEventHandlers: Map<string, Function>;
    let mockPresenceState: any;

    beforeEach(() => {
        presenceEventHandlers = new Map();
        mockPresenceState = {};

        // Mock channel with presence event handling
        mockChannel = {
            on: vi.fn((type: string, config: any, handler: Function) => {
                if (type === 'presence') {
                    presenceEventHandlers.set(config.event, handler);
                }
                return mockChannel;
            }),
            subscribe: vi.fn((callback: Function) => {
                // Simulate successful subscription
                setTimeout(() => callback('SUBSCRIBED'), 0);
                return mockChannel;
            }),
            track: vi.fn(async (data: any) => {
                // Simulate track call - in real implementation this should trigger sync events
                return { status: 'ok' };
            }),
            presenceState: vi.fn(() => mockPresenceState),
            state: 'joined',
        };

        vi.mocked(supabase.channel).mockReturnValue(mockChannel);

        // Mock auth store with a test user
        vi.mocked(useAuthStore).mockReturnValue({
            token: 'test-token',
            user: { id: 'user-b-id', username: 'UserB' },
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    /**
     * CRITICAL TEST: Check if join event handler is registered
     * 
     * The SocketProvider should listen for 'join' events to immediately update
     * when users join the presence channel. If this handler is missing, users
     * won't see each other come online until a sync event fires.
     * 
     * **EXPECTED TO FAIL**: The current implementation only registers a 'sync' handler.
     */
    it('COUNTEREXAMPLE 1: Missing join event handler - users do not see each other come online immediately', async () => {
        render(
            <SocketProvider>
                <TestComponent onStatusUpdate={() => { }} />
            </SocketProvider>
        );

        // Wait for channel setup
        await waitFor(() => {
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        // Check which event handlers were registered
        const hasJoinHandler = presenceEventHandlers.has('join');
        const hasSyncHandler = presenceEventHandlers.has('sync');
        const hasLeaveHandler = presenceEventHandlers.has('leave');

        // Document what handlers are registered
        console.log('Registered presence event handlers:', {
            join: hasJoinHandler,
            sync: hasSyncHandler,
            leave: hasLeaveHandler,
        });

        // The implementation SHOULD have join handler for immediate updates
        expect(hasJoinHandler).toBe(true);

        // If this fails, it means the SocketProvider doesn't listen for join events,
        // which is a root cause of the bug: users don't see each other come online immediately
    });

    /**
     * CRITICAL TEST: Check if leave event handler is registered
     * 
     * The SocketProvider should listen for 'leave' events to immediately update
     * when users leave the presence channel. If this handler is missing, users
     * will continue to show as online even after they disconnect.
     * 
     * **EXPECTED TO FAIL**: The current implementation only registers a 'sync' handler.
     */
    it('COUNTEREXAMPLE 2: Missing leave event handler - users continue to show as online after disconnecting', async () => {
        render(
            <SocketProvider>
                <TestComponent onStatusUpdate={() => { }} />
            </SocketProvider>
        );

        // Wait for channel setup
        await waitFor(() => {
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        // Check if leave handler was registered
        const hasLeaveHandler = presenceEventHandlers.has('leave');

        // The implementation SHOULD have leave handler for immediate offline updates
        expect(hasLeaveHandler).toBe(true);

        // If this fails, it means the SocketProvider doesn't listen for leave events,
        // which causes users to appear online even after they've disconnected
    });

    /**
     * Property 1: Bug Condition - Presence State Synchronization via Sync Events
     * 
     * This property tests that when sync events fire (which the current implementation
     * DOES handle), the partnerStatus map updates correctly.
     * 
     * This test should PASS on unfixed code because the sync handler exists and works.
     * The bug is that sync events don't fire frequently enough, and join/leave events
     * are not handled.
     */
    it('Property 1: Status updates propagate correctly when sync events fire (this works)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    userId: fc.string({ minLength: 5, maxLength: 20 }).filter(id => id !== 'user-b-id'),
                    status: fc.constantFrom('online', 'typing', 'reading_chat', 'browsing_files', 'viewing_notes', 'timetable_open'),
                }),
                async ({ userId, status }) => {
                    let capturedStatus: any = null;

                    const { unmount } = render(
                        <SocketProvider>
                            <TestComponent onStatusUpdate={(data) => { capturedStatus = data; }} />
                        </SocketProvider>
                    );

                    // Wait for channel setup
                    await waitFor(() => {
                        expect(mockChannel.subscribe).toHaveBeenCalled();
                    });

                    // Simulate presence state change and trigger sync event
                    await act(async () => {
                        mockPresenceState[userId] = [{ status }];
                        const syncHandler = presenceEventHandlers.get('sync');
                        if (syncHandler) {
                            syncHandler();
                        }
                    });

                    // Wait for update
                    await waitFor(() => {
                        expect(capturedStatus?.partnerStatus[userId]).toBe(status);
                    }, { timeout: 2000 });

                    unmount();
                }
            ),
            { numRuns: 10 }
        );
    });

    /**
     * COUNTEREXAMPLE 3: Join events don't trigger status updates
     * 
     * When a user joins the presence channel, a 'join' event fires but the
     * SocketProvider doesn't handle it. This means User B won't see User A
     * come online until a 'sync' event happens to fire.
     * 
     * **EXPECTED TO FAIL**: No join handler means join events are ignored.
     */
    it('COUNTEREXAMPLE 3: User join does not trigger immediate status update (only sync does)', async () => {
        const userAId = 'user-a-id';
        let capturedStatus: any = null;

        render(
            <SocketProvider>
                <TestComponent onStatusUpdate={(data) => { capturedStatus = data; }} />
            </SocketProvider>
        );

        await waitFor(() => {
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        // Simulate User A joining - update presence state but ONLY trigger join event
        await act(async () => {
            mockPresenceState[userAId] = [{ status: 'online' }];

            const joinHandler = presenceEventHandlers.get('join');
            if (joinHandler) {
                // If join handler exists, trigger it
                joinHandler({ key: userAId, newPresences: [{ status: 'online' }] });
            }
            // DO NOT trigger sync - we're testing if join alone works
        });

        // Try to wait for status update
        try {
            await waitFor(() => {
                expect(capturedStatus?.partnerStatus[userAId]).toBe('online');
            }, { timeout: 1000 });
        } catch (error) {
            // Expected to fail - join events don't trigger updates
            const hasJoinHandler = presenceEventHandlers.has('join');
            throw new Error(
                `COUNTEREXAMPLE: User join event did not trigger status update. ` +
                `Join handler registered: ${hasJoinHandler}. ` +
                `Current partnerStatus: ${JSON.stringify(capturedStatus?.partnerStatus || {})}. ` +
                `This demonstrates the bug: users don't see each other come online immediately.`
            );
        }
    });

    /**
     * COUNTEREXAMPLE 4: Leave events don't trigger status updates
     * 
     * When a user leaves the presence channel, a 'leave' event fires but the
     * SocketProvider doesn't handle it. This means User B will continue to see
     * User A as online even after they disconnect.
     * 
     * **EXPECTED TO FAIL**: No leave handler means leave events are ignored.
     */
    it('COUNTEREXAMPLE 4: User leave does not trigger immediate offline status (only sync does)', async () => {
        const userAId = 'user-a-id';
        let capturedStatus: any = null;

        render(
            <SocketProvider>
                <TestComponent onStatusUpdate={(data) => { capturedStatus = data; }} />
            </SocketProvider>
        );

        await waitFor(() => {
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        // First establish User A as online via sync
        await act(async () => {
            mockPresenceState[userAId] = [{ status: 'online' }];
            const syncHandler = presenceEventHandlers.get('sync');
            if (syncHandler) {
                syncHandler();
            }
        });

        await waitFor(() => {
            expect(capturedStatus?.partnerStatus[userAId]).toBe('online');
        });

        // Now simulate User A leaving - remove from presence state and trigger leave event
        await act(async () => {
            delete mockPresenceState[userAId];

            const leaveHandler = presenceEventHandlers.get('leave');
            if (leaveHandler) {
                leaveHandler({ key: userAId, leftPresences: [{ status: 'online' }] });
            }
            // DO NOT trigger sync - we're testing if leave alone works
        });

        // Try to wait for offline status
        try {
            await waitFor(() => {
                expect(capturedStatus?.partnerStatus[userAId]).toBe('offline');
            }, { timeout: 1000 });
        } catch (error) {
            // Expected to fail - leave events don't trigger updates
            const hasLeaveHandler = presenceEventHandlers.has('leave');
            throw new Error(
                `COUNTEREXAMPLE: User leave event did not trigger offline status. ` +
                `Leave handler registered: ${hasLeaveHandler}. ` +
                `Current partnerStatus for ${userAId}: ${capturedStatus?.partnerStatus[userAId]}. ` +
                `This demonstrates the bug: users continue to show as online after disconnecting.`
            );
        }
    });

    /**
     * COUNTEREXAMPLE 5: Rapid status changes may be missed without join/leave handlers
     * 
     * When users rapidly change states, relying only on sync events means some
     * state changes may be missed or delayed.
     */
    it('COUNTEREXAMPLE 5: Rapid state changes show delayed updates (sync-only approach)', async () => {
        const userAId = 'user-a-id';
        const stateSequence = ['online', 'typing', 'reading_chat', 'browsing_files'];
        let capturedStatus: any = null;
        let updateCount = 0;

        render(
            <SocketProvider>
                <TestComponent onStatusUpdate={(data) => {
                    capturedStatus = data;
                    updateCount++;
                }} />
            </SocketProvider>
        );

        await waitFor(() => {
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        // Rapidly change states - only trigger sync events
        for (const status of stateSequence) {
            await act(async () => {
                mockPresenceState[userAId] = [{ status }];
                const syncHandler = presenceEventHandlers.get('sync');
                if (syncHandler) {
                    syncHandler();
                }
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // With proper join/leave/sync handling, we should see 4 updates
        // With sync-only, we might see fewer or delayed updates
        console.log(`Rapid state changes: ${stateSequence.length} changes, ${updateCount} updates received`);

        // Final state should be correct
        await waitFor(() => {
            expect(capturedStatus?.partnerStatus[userAId]).toBe('browsing_files');
        }, { timeout: 2000 });

        // Document the update pattern
        if (updateCount < stateSequence.length) {
            console.warn(
                `COUNTEREXAMPLE: Only ${updateCount} updates received for ${stateSequence.length} state changes. ` +
                `This demonstrates potential delays in status propagation with sync-only approach.`
            );
        }
    });
});
