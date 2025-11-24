import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { backgroundTestingService } from '../services/background-testing-service';

/**
 * Background Testing WebSocket Handler
 * 
 * Provides real-time notifications for background test execution:
 * - Test queued events
 * - Test started events
 * - Test completed events (with results)
 * - Test failed events
 * - Agent notifications for failed tests
 */
export function setupBackgroundTestingWebSocket(wss: WebSocket.Server) {
  console.log('[BackgroundTestingWS] Setting up WebSocket handler');
  
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('[BackgroundTestingWS] New client connected');
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }));
    
    // Listen to background testing service events
    const handleTestQueued = (data: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'test:queued',
          data,
          timestamp: new Date().toISOString()
        }));
      }
    };
    
    const handleTestStarted = (data: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'test:started',
          data,
          timestamp: new Date().toISOString()
        }));
      }
    };
    
    const handleTestCompleted = (data: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'test:completed',
          data,
          timestamp: new Date().toISOString()
        }));
      }
    };
    
    const handleTestFailed = (data: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'test:failed',
          data,
          timestamp: new Date().toISOString()
        }));
      }
    };
    
    const handleAgentNotification = (data: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'test:agent-notification',
          data,
          timestamp: new Date().toISOString()
        }));
      }
    };
    
    // Register event listeners
    backgroundTestingService.on('test:queued', handleTestQueued);
    backgroundTestingService.on('test:started', handleTestStarted);
    backgroundTestingService.on('test:completed', handleTestCompleted);
    backgroundTestingService.on('test:failed', handleTestFailed);
    backgroundTestingService.on('test:agent-notification', handleAgentNotification);
    
    // Handle incoming messages from client
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'subscribe':
            // Client subscribes to specific project updates
            console.log(`[BackgroundTestingWS] Client subscribed to project ${data.projectId}`);
            ws.send(JSON.stringify({
              type: 'subscribed',
              projectId: data.projectId,
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'get-status':
            // Client requests current test status
            const status = backgroundTestingService.getTestStatus(data.projectId);
            ws.send(JSON.stringify({
              type: 'status',
              projectId: data.projectId,
              status,
              timestamp: new Date().toISOString()
            }));
            break;
            
          default:
            console.warn('[BackgroundTestingWS] Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('[BackgroundTestingWS] Error processing message:', error);
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('[BackgroundTestingWS] Client disconnected');
      
      // Clean up event listeners
      backgroundTestingService.off('test:queued', handleTestQueued);
      backgroundTestingService.off('test:started', handleTestStarted);
      backgroundTestingService.off('test:completed', handleTestCompleted);
      backgroundTestingService.off('test:failed', handleTestFailed);
      backgroundTestingService.off('test:agent-notification', handleAgentNotification);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('[BackgroundTestingWS] WebSocket error:', error);
    });
  });
}
