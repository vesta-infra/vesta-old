import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:logs')
  handleSubscribeLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deploymentId: string },
  ) {
    client.join(`logs:${data.deploymentId}`);
    this.logger.debug(
      `Client ${client.id} subscribed to logs:${data.deploymentId}`,
    );
  }

  @SubscribeMessage('subscribe:deployment')
  handleSubscribeDeployment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deploymentId: string },
  ) {
    client.join(`deployment:${data.deploymentId}`);
  }

  @SubscribeMessage('subscribe:metrics')
  handleSubscribeMetrics(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { serverId: string },
  ) {
    client.join(`metrics:${data.serverId}`);
  }

  @SubscribeMessage('subscribe:activity')
  handleSubscribeActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { teamId: string },
  ) {
    client.join(`activity:${data.teamId}`);
  }

  @SubscribeMessage('subscribe:database')
  handleSubscribeDatabase(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { databaseId: string },
  ) {
    client.join(`database:${data.databaseId}`);
    this.logger.debug(
      `Client ${client.id} subscribed to database:${data.databaseId}`,
    );
  }

  // --- Internal event listeners that forward to WebSocket clients ---

  @OnEvent('deployment.status')
  handleDeploymentStatus(payload: {
    deploymentId: string;
    status: string;
    message?: string;
  }) {
    this.server
      .to(`deployment:${payload.deploymentId}`)
      .emit('deployment:status', payload);
  }

  @OnEvent('deployment.log')
  handleDeploymentLog(payload: {
    deploymentId: string;
    line: string;
    timestamp: string;
    stream: string;
  }) {
    this.server
      .to(`logs:${payload.deploymentId}`)
      .emit('log:line', payload);
  }

  @OnEvent('deployment.complete')
  handleDeploymentComplete(payload: {
    deploymentId: string;
    status: string;
    url?: string;
  }) {
    this.server
      .to(`deployment:${payload.deploymentId}`)
      .emit('deployment:complete', payload);
  }

  @OnEvent('metrics.update')
  handleMetricsUpdate(payload: { serverId: string; [key: string]: unknown }) {
    this.server
      .to(`metrics:${payload.serverId}`)
      .emit('metrics:update', payload);
  }

  @OnEvent('scaling.changed')
  handleScalingChanged(payload: {
    environmentId: string;
    desired: number;
    running: number;
  }) {
    this.server.emit('scaling:changed', payload);
  }

  @OnEvent('activity.event')
  handleActivityEvent(payload: { teamId: string; event: unknown }) {
    this.server
      .to(`activity:${payload.teamId}`)
      .emit('activity:event', payload);
  }

  @OnEvent('database.status')
  handleDatabaseStatus(payload: {
    databaseId: string;
    teamId: string;
    status: string;
  }) {
    this.server
      .to(`database:${payload.databaseId}`)
      .emit('database:status', payload);
  }

  @OnEvent('database.log')
  handleDatabaseLog(payload: {
    databaseId: string;
    teamId: string;
    line: string;
    timestamp: string;
  }) {
    this.server
      .to(`database:${payload.databaseId}`)
      .emit('database:log', payload);
  }

  emitToDeployment(deploymentId: string, event: string, data: unknown) {
    this.server.to(`deployment:${deploymentId}`).emit(event, data);
  }

  emitToTeam(teamId: string, event: string, data: unknown) {
    this.server.to(`activity:${teamId}`).emit(event, data);
  }
}
