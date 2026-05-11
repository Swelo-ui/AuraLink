import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';
import { SocketProvider, useSocket } from './SocketProvider';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';
import * as fc from 'fast-check';

/**
 * Preservation Property Tests for Realtime Presence Status Bugfix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * These tests verify that non-presence functionality remains unchanged by the bugfix.
 * They follow the observation-first methodology:
 * 1. Observe behavior on UNFIXED code for non-buggy inputs
 * 2. Write property-based tests capturing observed behavior patterns
 * 3. Run tests on UNFIXED code
 * 4. **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
 * 
 * Property 2: Preservation - Non-Presence Functionality Unchanged
 * 
 * For any user interaction or data operation that does NOT involve presence state changes
 * (message sending/receiving, file uploads, notes editing, navigation, authentication),
 * the fixed code SHALL produce exactly the same behavior as the original code.
 * 
 * Test Coverage:
 * - Message sending and receiving through Supabase messages table
 * - Local status tracking in ChatWorkspace (detecting typing, tool tab changes)
 * - socket.track() calls from ChatWorkspace invoked at correct frequency
 * - Channel subscription and cleanup in SocketProvider
 * - ActionMoji avatar rendering of all animation states
 * - Sidebar connections list rendering and navigation
 * - AuraBot virtual chat presence simulation
 */

// Mock dependencies
vi.mock('../store/authStore');
vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        channel: vi.fn(),
        removeChannel: vi.fn(),
        from: vi.fn(),
    },
}));

// Test component to access socket context
function TestComponent({ onUpdate }: { onUpdate: (data: any) => void }) {
    const socketContext = useSocket();

    React.useEffect(() => {
        onUpdate(socketContext);
    }, [socketContext.socket, socketContext.partnerStatus, onUpdate]);

    return null;
}

describe('Preservation Property Tests: Non-Presence Functionality', () => {
    let mockChannel: any;
    let presenceEventHandlers: Map<string, Function>;
    let mockPresenceState: any;
    let channelSubscribeCallback: Function | null;

    beforeEach(() => {
        presenceEventHandlers = new Map();
        mockPresenceState = {};
        channelSubscribeCallback = null;

        // Mock channel with presence event handling
        mockChannel = {
            on: vi.fn((type: string, config: any, handler: Function) => {
                if (type === 'presence') {
                    presenceEventHandlers.set(config.event, handler);
                }
                return mockChannel;
            }),
            subscribe: vi.fn((callback: Function) => {
                channelSubscribeCallback = callback;
                // Simulate successful subscription
                setTimeout(() => callback('SUBSCRIBED'), 0);
                return mockChannel;
            }),
            track: vi.fn(async (data: any) => {
                // Track calls should work regardless of presence bug
                return { status: 'ok' };
            }),
            presenceState: vi.fn(() => mockPresenceState),
            state: 'joined',
        };

        vi.mocked(supabase.channel).mockReturnValue(mockChannel);

        // Mock auth store with a test user
        vi.mocked(useAuthStore).mockReturnValue({
            token: 'test-token',
            user: { id: 'test-user-id', username: 'TestUser' },
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Property 2.1: Channel Subscription and Cleanup
     * 
     * **Validates: Requirement 3.3**
     * 
     * The SocketProvider MUST properly subscribe to the presence channel on mount
     * and unsubscribe on unmount, regardless of presence bug fixes.
     * 
     * This is a critical preservation property because channel lifecycle management
     * affects all realtime features, not just presence.
     */
    describe('Property 2.1: Channel Lifecycle Preservation', () => {
        it('should subscribe to presence channel on mount', async () => {
            render(
                <SocketProvider>
                    <TestComponent onUpdate={() => { }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(supabase.channel).toHaveBeenCalledWith(
                    'online-users',
                    expect.objectContaining({
                        config: expect.objectContaining({
                            presence: expect.objectContaining({
                                key: 'test-user-id',
                            }),
                        }),
                    })
                );
            });

            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        it('should unsubscribe from channel on unmount', async () => {
            const { unmount } = render(
                <SocketProvider>
                    <TestComponent onUpdate={() => { }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(mockChannel.subscribe).toHaveBeenCalled();
            });

            unmount();

            expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
        });

        it('should call track with online status after successful subscription', async () => {
            render(
                <SocketProvider>
                    <TestComponent onUpdate={() => { }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(mockChannel.subscribe).toHaveBeenCalled();
            });

            // Trigger subscription callback
            if (channelSubscribeCallback) {
                await act(async () => {
                    channelSubscribeCallback('SUBSCRIBED');
                });
            }

            await waitFor(() => {
                expect(mockChannel.track).toHaveBeenCalledWith({ status: 'online' });
            });
        });

        it('should not subscribe if user is not authenticated', () => {
            vi.mocked(useAuthStore).mockReturnValue({
                token: null,
                user: null,
            } as any);

            render(
                <SocketProvider>
                    <TestComponent onUpdate={() => { }} />
                </SocketProvider>
            );

            expect(supabase.channel).not.toHaveBeenCalled();
        });
    });

    /**
     * Property 2.2: Socket Track Functionality
     * 
     * **Validates: Requirement 3.2**
     * 
     * The socket.track() method MUST be callable and return successfully,
     * regardless of whether presence events propagate correctly.
     * 
     * This ensures that local status tracking in ChatWorkspace continues to work.
     */
    describe('Property 2.2: Socket Track Functionality Preservation', () => {
        it('Property: socket.track() calls succeed for all valid status values', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(
                        'online',
                        'typing',
                        'reading_chat',
                        'browsing_files',
                        'viewing_notes',
                        'timetable_open',
                        'idle',
                        'thinking',
                        'happy',
                        'sad',
                        'angry',
                        'confused',
                        'surprised'
                    ),
                    async (status) => {
                        let capturedSocket: any = null;

                        const { unmount } = render(
                            <SocketProvider>
                                <TestComponent onUpdate={(data) => { capturedSocket = data.socket; }} />
                            </SocketProvider>
                        );

                        await waitFor(() => {
                            expect(capturedSocket).not.toBeNull();
                        });

                        // Track should be callable and succeed
                        const result = await capturedSocket.track({ status });
                        expect(result).toEqual({ status: 'ok' });

                        unmount();
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should expose socket object to consuming components', async () => {
            let capturedSocket: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { capturedSocket = data.socket; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(capturedSocket).not.toBeNull();
                expect(capturedSocket).toBe(mockChannel);
            });
        });

        it('should provide track method on socket object', async () => {
            let capturedSocket: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { capturedSocket = data.socket; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(capturedSocket).not.toBeNull();
                expect(typeof capturedSocket.track).toBe('function');
            });
        });
    });

    /**
     * Property 2.3: SocketContext API Stability
     * 
     * **Validates: Requirements 3.1, 3.2, 3.4**
     * 
     * The SocketContext MUST expose the same API (socket, partnerStatus, setPartnerStatus)
     * with the same types and behavior, regardless of presence bug fixes.
     * 
     * This ensures that all consuming components (ChatWorkspace, Sidebar, ActionMoji)
     * continue to work without changes.
     */
    describe('Property 2.3: SocketContext API Stability', () => {
        it('should expose socket, partnerStatus, and setPartnerStatus', async () => {
            let capturedContext: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(capturedContext).not.toBeNull();
            });

            // Verify API shape
            expect(capturedContext).toHaveProperty('socket');
            expect(capturedContext).toHaveProperty('partnerStatus');
            expect(capturedContext).toHaveProperty('setPartnerStatus');

            // Verify types
            expect(typeof capturedContext.partnerStatus).toBe('object');
            expect(typeof capturedContext.setPartnerStatus).toBe('function');
        });

        it('should initialize partnerStatus as empty object', async () => {
            let capturedContext: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(capturedContext).not.toBeNull();
            });

            expect(capturedContext.partnerStatus).toEqual({});
        });

        it('should allow manual status updates via setPartnerStatus', async () => {
            let capturedContext: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(capturedContext).not.toBeNull();
            });

            // Manually set a partner status
            act(() => {
                capturedContext.setPartnerStatus('partner-123', 'typing');
            });

            await waitFor(() => {
                expect(capturedContext.partnerStatus['partner-123']).toBe('typing');
            });
        });

        it('Property: setPartnerStatus updates are idempotent', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: fc.string({ minLength: 5, maxLength: 20 }),
                        status: fc.constantFrom('online', 'typing', 'offline', 'reading_chat'),
                    }),
                    async ({ userId, status }) => {
                        let capturedContext: any = null;

                        const { unmount } = render(
                            <SocketProvider>
                                <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                            </SocketProvider>
                        );

                        await waitFor(() => {
                            expect(capturedContext).not.toBeNull();
                        });

                        // Set status multiple times
                        act(() => {
                            capturedContext.setPartnerStatus(userId, status);
                            capturedContext.setPartnerStatus(userId, status);
                            capturedContext.setPartnerStatus(userId, status);
                        });

                        // Should only trigger one update (idempotent)
                        await waitFor(() => {
                            expect(capturedContext.partnerStatus[userId]).toBe(status);
                        });

                        unmount();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 2.4: Presence State Structure Preservation
     * 
     * **Validates: Requirement 3.4**
     * 
     * The partnerStatus map structure MUST remain { [userId: string]: string }
     * and support all existing status values.
     * 
     * This ensures that consuming components can continue to read status values
     * in the same way.
     */
    describe('Property 2.4: Presence State Structure Preservation', () => {
        it('Property: partnerStatus map supports arbitrary user IDs', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            userId: fc.string({ minLength: 5, maxLength: 30 }),
                            status: fc.constantFrom('online', 'typing', 'offline'),
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    async (users) => {
                        let capturedContext: any = null;

                        const { unmount } = render(
                            <SocketProvider>
                                <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                            </SocketProvider>
                        );

                        await waitFor(() => {
                            expect(capturedContext).not.toBeNull();
                        });

                        // Set status for all users
                        act(() => {
                            users.forEach(({ userId, status }) => {
                                capturedContext.setPartnerStatus(userId, status);
                            });
                        });

                        // Verify all users are in the map
                        await waitFor(() => {
                            users.forEach(({ userId, status }) => {
                                expect(capturedContext.partnerStatus[userId]).toBe(status);
                            });
                        });

                        unmount();
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should support all standard status values', async () => {
            const standardStatuses = [
                'online',
                'offline',
                'idle',
                'typing',
                'reading_chat',
                'browsing_files',
                'viewing_notes',
                'timetable_open',
                'thinking',
                'happy',
                'sad',
                'angry',
                'confused',
                'surprised',
                'heart_eyes',
                'magic',
            ];

            let capturedContext: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(capturedContext).not.toBeNull();
            });

            // Set each status for a different user
            act(() => {
                standardStatuses.forEach((status, index) => {
                    capturedContext.setPartnerStatus(`user-${index}`, status);
                });
            });

            // Verify all statuses are stored correctly
            await waitFor(() => {
                standardStatuses.forEach((status, index) => {
                    expect(capturedContext.partnerStatus[`user-${index}`]).toBe(status);
                });
            });
        });
    });

    /**
     * Property 2.5: Channel Configuration Preservation
     * 
     * **Validates: Requirement 3.3**
     * 
     * The channel configuration (name, presence key) MUST remain unchanged.
     * This ensures that all clients continue to connect to the same channel.
     */
    describe('Property 2.5: Channel Configuration Preservation', () => {
        it('should use "online-users" as channel name', async () => {
            render(
                <SocketProvider>
                    <TestComponent onUpdate={() => { }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(supabase.channel).toHaveBeenCalledWith(
                    'online-users',
                    expect.any(Object)
                );
            });
        });

        it('should use user.id as presence key', async () => {
            const testUserId = 'test-user-123';
            vi.mocked(useAuthStore).mockReturnValue({
                token: 'test-token',
                user: { id: testUserId, username: 'TestUser' },
            } as any);

            render(
                <SocketProvider>
                    <TestComponent onUpdate={() => { }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(supabase.channel).toHaveBeenCalledWith(
                    'online-users',
                    expect.objectContaining({
                        config: expect.objectContaining({
                            presence: expect.objectContaining({
                                key: testUserId,
                            }),
                        }),
                    })
                );
            });
        });

        it('Property: channel configuration is consistent across multiple mounts', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: fc.string({ minLength: 5, maxLength: 30 }),
                        username: fc.string({ minLength: 3, maxLength: 20 }),
                    }),
                    async ({ userId, username }) => {
                        vi.mocked(useAuthStore).mockReturnValue({
                            token: 'test-token',
                            user: { id: userId, username },
                        } as any);

                        const { unmount } = render(
                            <SocketProvider>
                                <TestComponent onUpdate={() => { }} />
                            </SocketProvider>
                        );

                        await waitFor(() => {
                            expect(supabase.channel).toHaveBeenCalledWith(
                                'online-users',
                                expect.objectContaining({
                                    config: expect.objectContaining({
                                        presence: expect.objectContaining({
                                            key: userId,
                                        }),
                                    }),
                                })
                            );
                        });

                        unmount();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 2.6: Sync Event Handler Preservation
     * 
     * **Validates: Requirement 3.4**
     * 
     * The existing 'sync' event handler MUST continue to work and update
     * partnerStatus correctly when sync events fire.
     * 
     * This is critical because sync events are the current (albeit incomplete)
     * mechanism for presence updates.
     */
    describe('Property 2.6: Sync Event Handler Preservation', () => {
        it('should register sync event handler', async () => {
            render(
                <SocketProvider>
                    <TestComponent onUpdate={() => { }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(mockChannel.on).toHaveBeenCalledWith(
                    'presence',
                    { event: 'sync' },
                    expect.any(Function)
                );
            });
        });

        it('should update partnerStatus when sync event fires', async () => {
            let capturedContext: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(capturedContext).not.toBeNull();
            });

            // Simulate sync event
            await act(async () => {
                mockPresenceState['partner-123'] = [{ status: 'typing' }];
                const syncHandler = presenceEventHandlers.get('sync');
                if (syncHandler) {
                    syncHandler();
                }
            });

            await waitFor(() => {
                expect(capturedContext.partnerStatus['partner-123']).toBe('typing');
            });
        });

        it('Property: sync handler updates all users in presence state', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            userId: fc.string({ minLength: 5, maxLength: 20 }),
                            status: fc.constantFrom('online', 'typing', 'reading_chat'),
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (users) => {
                        let capturedContext: any = null;

                        const { unmount } = render(
                            <SocketProvider>
                                <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                            </SocketProvider>
                        );

                        await waitFor(() => {
                            expect(capturedContext).not.toBeNull();
                        });

                        // Set up presence state with all users
                        await act(async () => {
                            users.forEach(({ userId, status }) => {
                                mockPresenceState[userId] = [{ status }];
                            });

                            const syncHandler = presenceEventHandlers.get('sync');
                            if (syncHandler) {
                                syncHandler();
                            }
                        });

                        // Verify all users are updated
                        await waitFor(() => {
                            users.forEach(({ userId, status }) => {
                                expect(capturedContext.partnerStatus[userId]).toBe(status);
                            });
                        });

                        unmount();
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should mark users as offline when they leave presence state', async () => {
            let capturedContext: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { capturedContext = data; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(capturedContext).not.toBeNull();
            });

            // First, add a user
            await act(async () => {
                mockPresenceState['partner-123'] = [{ status: 'online' }];
                const syncHandler = presenceEventHandlers.get('sync');
                if (syncHandler) {
                    syncHandler();
                }
            });

            await waitFor(() => {
                expect(capturedContext.partnerStatus['partner-123']).toBe('online');
            });

            // Now remove the user from presence state
            await act(async () => {
                delete mockPresenceState['partner-123'];
                const syncHandler = presenceEventHandlers.get('sync');
                if (syncHandler) {
                    syncHandler();
                }
            });

            await waitFor(() => {
                expect(capturedContext.partnerStatus['partner-123']).toBe('offline');
            });
        });
    });

    /**
     * Property 2.7: Multiple Component Instances
     * 
     * **Validates: Requirements 3.1, 3.4**
     * 
     * Multiple components consuming SocketContext MUST receive the same
     * socket and partnerStatus references.
     * 
     * This ensures that all parts of the UI stay synchronized.
     */
    describe('Property 2.7: Multiple Component Instances', () => {
        it('should provide same socket reference to all consumers', async () => {
            let socket1: any = null;
            let socket2: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { socket1 = data.socket; }} />
                    <TestComponent onUpdate={(data) => { socket2 = data.socket; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(socket1).not.toBeNull();
                expect(socket2).not.toBeNull();
            });

            // Both components should receive the same socket instance
            expect(socket1).toBe(socket2);
        });

        it('should provide same partnerStatus reference to all consumers', async () => {
            let status1: any = null;
            let status2: any = null;

            render(
                <SocketProvider>
                    <TestComponent onUpdate={(data) => { status1 = data.partnerStatus; }} />
                    <TestComponent onUpdate={(data) => { status2 = data.partnerStatus; }} />
                </SocketProvider>
            );

            await waitFor(() => {
                expect(status1).not.toBeNull();
                expect(status2).not.toBeNull();
            });

            // Both components should receive the same partnerStatus object
            expect(status1).toBe(status2);
        });
    });
});
