'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: { token },
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef.current;
}

export function useDeploymentLogs(deploymentId: string | null) {
  const socket = useSocket();
  const [lines, setLines] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!socket || !deploymentId) {
      setLines([]);
      return;
    }

    setLines([]);
    setIsStreaming(true);

    socket.emit('subscribe:logs', { deploymentId });
    socket.emit('subscribe:deployment', { deploymentId });

    const handleLine = (data: { line: string }) => {
      setLines((prev) => [...prev, data.line]);
    };

    const handleStatus = (data: { status: string }) => {
      setLines((prev) => [...prev, `[status] ${data.status}`]);
    };

    const handleComplete = () => {
      setIsStreaming(false);
    };

    socket.on('log:line', handleLine);
    socket.on('deployment:status', handleStatus);
    socket.on('deployment:complete', handleComplete);

    return () => {
      socket.off('log:line', handleLine);
      socket.off('deployment:status', handleStatus);
      socket.off('deployment:complete', handleComplete);
    };
  }, [socket, deploymentId]);

  const clear = useCallback(() => setLines([]), []);

  return { lines, isStreaming, clear };
}

export function useDatabaseLogs(databaseId: string | null) {
  const socket = useSocket();
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!socket || !databaseId) {
      setLines([]);
      setStatus(null);
      return;
    }

    setLines([]);
    setIsStreaming(true);

    socket.emit('subscribe:database', { databaseId });

    const handleLog = (data: { line: string }) => {
      setLines((prev) => [...prev, data.line]);
    };

    const handleStatus = (data: { status: string }) => {
      setStatus(data.status);
      setIsStreaming(false);
    };

    socket.on('database:log', handleLog);
    socket.on('database:status', handleStatus);

    return () => {
      socket.off('database:log', handleLog);
      socket.off('database:status', handleStatus);
    };
  }, [socket, databaseId]);

  return { lines, status, isStreaming };
}
