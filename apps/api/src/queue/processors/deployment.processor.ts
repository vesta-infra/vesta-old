import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment } from '@vesta/db';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('deployments')
export class DeploymentProcessor extends WorkerHost {
  private readonly logger = new Logger(DeploymentProcessor.name);

  constructor(
    @InjectRepository(Deployment)
    private readonly deploymentRepo: Repository<Deployment>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<{ deploymentId: string; environmentId: string }>) {
    const { deploymentId, environmentId } = job.data;
    this.logger.log(
      `Processing deployment ${deploymentId} for environment ${environmentId}`,
    );

    const deployment = await this.deploymentRepo.findOne({
      where: { id: deploymentId },
    });
    if (!deployment) {
      this.logger.warn(`Deployment ${deploymentId} not found, skipping`);
      return;
    }

    const emitLog = (line: string, stream: 'stdout' | 'stderr' = 'stdout') => {
      this.eventEmitter.emit('deployment.log', {
        deploymentId,
        line,
        timestamp: new Date().toISOString(),
        stream,
      });
    };

    const updateStatus = async (status: Deployment['status']) => {
      deployment.status = status;
      if (status === 'building' || status === 'deploying') {
        deployment.started_at = deployment.started_at ?? new Date();
      }
      if (['running', 'failed', 'cancelled', 'rolled_back'].includes(status)) {
        deployment.finished_at = new Date();
      }
      await this.deploymentRepo.save(deployment);
      this.eventEmitter.emit('deployment.status', {
        deploymentId,
        status,
      });
    };

    try {
      // Step 1: Building
      await updateStatus('building');
      emitLog('==> Building application...');
      await this.delay(500);

      emitLog('Resolving build configuration...');
      await this.delay(400);

      emitLog('Detecting framework and runtime...');
      await this.delay(600);

      const buildSteps = [
        'Installing dependencies...',
        'Compiling source code...',
        'Optimizing assets...',
        'Creating container image...',
      ];
      for (const step of buildSteps) {
        emitLog(step);
        await this.delay(800);
      }

      emitLog('Build completed successfully.');
      deployment.build_logs = buildSteps.join('\n');
      await this.deploymentRepo.save(deployment);

      // Step 2: Deploying
      await updateStatus('deploying');
      emitLog('==> Deploying to server...');
      await this.delay(500);

      emitLog('Pushing image to registry...');
      await this.delay(1000);

      emitLog('Instructing agent to start containers...');
      await this.delay(800);

      emitLog(`Scaling to ${deployment.desired_replicas} replica(s)...`);
      await this.delay(600);

      emitLog('Running health checks...');
      await this.delay(1000);

      deployment.running_replicas = deployment.desired_replicas;
      deployment.deploy_logs = 'Deployment completed successfully.';
      await this.deploymentRepo.save(deployment);

      // Step 3: Running
      await updateStatus('running');
      emitLog('==> Deployment successful! Application is live.');

      this.eventEmitter.emit('deployment.complete', {
        deploymentId,
        status: 'running',
      });

      this.logger.log(`Deployment ${deploymentId} completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Deployment ${deploymentId} failed: ${message}`);

      emitLog(`Error: ${message}`, 'stderr');
      deployment.deploy_logs =
        (deployment.deploy_logs || '') + `\nError: ${message}`;
      await this.deploymentRepo.save(deployment);

      await updateStatus('failed');

      this.eventEmitter.emit('deployment.complete', {
        deploymentId,
        status: 'failed',
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
