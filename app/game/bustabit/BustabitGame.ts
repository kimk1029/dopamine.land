// BustabitGame.ts
// BUSTABIT crash 게임 엔진 (canvas / pixel-arcade 스타일)
//
// 게임 흐름 (서버 권위):
//  1. start  : 서버가 crashPoint 생성 + 베팅 차감 (POST /api/game/crash {action:'start'})
//  2. 클라이언트는 배율 상승을 애니메이션으로 표현
//  3. cashout: 크래시 전 캐시아웃 → bet × multiplier 지급
//  4. crash  : 캐시아웃 없이 크래시 → 패배 정산
//  로그인 토큰이 없으면 데모 모드(로컬 10,000P)로 동작한다.

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  onClick: () => void;
  visible: boolean;
  disabled?: boolean;
}

interface GameLog {
  type: 'bet' | 'win' | 'lose' | 'info';
  message: string;
  time: string;
  pointsChange?: number;
  balance?: number;
}

// ── 픽셀 아케이드 팔레트 (styles/arcade 디자인 패밀리) ──────────────
const C = {
  bg: '#0a0a1a',
  panel: '#11112a',
  border: '#333355',
  magenta: '#ff00ff',
  cyan: '#00ffff',
  lime: '#39ff14',
  yellow: '#ffe600',
  white: '#ffffff',
  dim: '#8888aa',
} as const;

const FONT_PIXEL = "'Press Start 2P', 'Galmuri11', monospace";
const FONT_KR = "'Galmuri11', monospace";

const MAX_BET = 1000000; // 서버측 상한 (app/api/game/crash/route.ts)
const DEMO_START_POINTS = 10000;

// 데모 모드 전용 크래시 포인트 (서버 lib/game-servers/crash-server.ts 와 동일한 분포)
function generateDemoCrashPoint(): number {
  const r = Math.random();
  return Math.max(1.0, Math.floor((0.99 / (1 - r)) * 100) / 100);
}

export class BustabitGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private readonly instanceId: number;

  // 게임 상태 변수
  private isRunning: boolean = false;
  private isGameEnded: boolean = false;
  private multiplier: number = 1.0;
  private crashed: boolean = false;
  private crashPoint: number = 1.0;
  private hasCashedOut: boolean = false;

  private betAmount: number = 0;
  private playerPoints: number = 0;
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private cashOutMultiplier: number = 1.0;
  private selectedBetAmount: number = 0;
  private autoCashout: number = 0; // 0 means disabled
  private gameSessionId: string | null = null; // 서버 게임 세션 ID
  private isDemo: boolean = false; // 토큰 없음 → 로컬 데모 플레이

  // 캔버스 크기 및 레이아웃
  private canvasWidth: number = 1200;
  private canvasHeight: number = 800;
  private sidebarWidth: number = 300;
  private gameAreaWidth: number = 900;

  // 반응형 스케일 팩터
  private scaleFactor: number = 1;
  private isMobile: boolean = false;
  private isTablet: boolean = false;

  private logs: GameLog[] = [];
  private logScrollOffset: number = 0;

  private betButton: Button | null = null;
  private cashOutButton: Button | null = null;
  private settingsButton: Button | null = null;
  private backButton: Button | null = null;
  private betAmountButtons: Button[] = [];

  private isSettingsOpen: boolean = false;

  private gameSpeed: number = 0.085;
  private isDraggingSlider: boolean = false;

  private crashHistory: number[] = []; // 라운드 크래시 배율 히스토리 (현재 세션)

  private onMessage?: (message: string) => void;
  private onLoadingProgress?: (progress: number) => void;
  private onRoundEnd?: () => void; // 라운드 정산 완료 후 호출 (히스토리 갱신용)

  public setMessageCallback(callback: (msg: string) => void) {
    this.onMessage = callback;
  }

  public setLoadingProgressCallback(callback: (progress: number) => void) {
    this.onLoadingProgress = callback;
  }

  public setRoundEndCallback(callback: () => void) {
    this.onRoundEnd = callback;
  }

  // 정적 배경 캐싱
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;

  private isProcessing: boolean = false;

  constructor(canvas: HTMLCanvasElement, betAmount: number = 0, width: number = 1200, height: number = 800) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.instanceId = Math.random();
    (this.canvas as any).__activeBustabitInstance = this.instanceId;

    // 초기 리사이즈
    this.resize(width, height);

    this.createButtons();
    this.setupEventListeners();

    // 초기화 및 로딩 시작
    this.resetGame(true);

    // ?bet= 쿼리 파라미터로 전달된 초기 베팅액 (resetGame 이후 적용)
    if (betAmount > 0) {
      this.selectedBetAmount = Math.min(Math.floor(betAmount), MAX_BET);
      this.updateButtonStates();
    }
  }

  private async loadUserPoints() {
    if (this.onLoadingProgress) {
      this.onLoadingProgress(30);
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        if (this.onLoadingProgress) this.onLoadingProgress(50);

        const res = await fetch('/api/user/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.points !== undefined) {
          this.playerPoints = data.points;
        }

        if (this.onLoadingProgress) this.onLoadingProgress(100);
      } catch (error) {
        console.error(error);
        if (this.onLoadingProgress) this.onLoadingProgress(100);
      }
    } else {
      // 데모 모드: 로컬 포인트 지급
      this.isDemo = true;
      this.playerPoints = DEMO_START_POINTS;
      this.addLog('info', `데모 모드 시작 (${DEMO_START_POINTS.toLocaleString()}P 지급)`);
      if (this.onLoadingProgress) this.onLoadingProgress(100);
    }
  }

  private showMessage(msg: string) {
    if (this.onMessage) {
      this.onMessage(msg);
    }
  }

  private addLog(type: 'bet' | 'win' | 'lose' | 'info', message: string, pointsChange: number = 0, balance: number = 0) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    this.logs.unshift({
      type,
      message,
      time: timeStr,
      pointsChange,
      balance
    });

    if (this.logs.length > 50) {
      this.logs.pop();
    }
    this.render();
  }

  // 정적 배경 캐싱 (배경색 + 사이드바 프레임)
  private cacheStaticLayer() {
    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = this.canvasWidth;
    this.staticCanvas.height = this.canvasHeight;
    this.staticCtx = this.staticCanvas.getContext('2d');

    if (!this.staticCtx) return;

    const ctx = this.staticCtx;
    ctx.imageSmoothingEnabled = false;

    // 1. 전체 배경
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 2. 사이드바 (로그 패널)
    if (this.sidebarWidth > 0) {
      const sx = this.gameAreaWidth;
      const w = this.sidebarWidth;

      ctx.fillStyle = C.panel;
      ctx.fillRect(sx, 0, w, this.canvasHeight);

      // 4px 픽셀 경계선
      ctx.fillStyle = C.magenta;
      ctx.fillRect(sx, 0, 4, this.canvasHeight);

      ctx.fillStyle = C.cyan;
      ctx.font = `10px ${FONT_PIXEL}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('HISTORY_LOG', sx + 20, 40);
      ctx.fillStyle = C.border;
      ctx.fillRect(sx + 16, 52, w - 32, 3);
    }
  }

  public resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false; // 픽셀 렌더링 (canvas 크기 변경 시 리셋되므로 재설정)

    this.isMobile = width < 768;
    this.isTablet = width >= 768 && width < 1280;

    if (this.isMobile) {
      this.sidebarWidth = 0;
      this.gameAreaWidth = width;
      this.scaleFactor = Math.min(width / 400, 1.2);
    } else if (this.isTablet) {
      this.sidebarWidth = width * 0.25;
      this.gameAreaWidth = width - this.sidebarWidth;
      this.scaleFactor = Math.min(width / 800, 0.9);
    } else {
      this.sidebarWidth = 300;
      this.gameAreaWidth = width - this.sidebarWidth;
      this.scaleFactor = 1.0;
    }

    // UI 요소 위치 재계산
    this.createButtons();

    // 리사이즈 시 배경 다시 캐싱
    this.cacheStaticLayer();

    if (!this.isRunning) {
      this.render();
    }
  }

  private setupEventListeners() {
    const handleInput = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.handleClick(x, y);
    }

    this.canvas.addEventListener('click', (e) => handleInput(e.clientX, e.clientY));

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        this.handleMouseDown(x, y);
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0 && this.isDraggingSlider) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        this.handleMouseMove(x, y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.handleMouseUp();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleMouseDown(x, y);
    });

    this.canvas.addEventListener('mouseup', () => {
      this.handleMouseUp();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleMouseMove(x, y);
      this.canvas.style.cursor = this.getCursorAt(x, y);
    });

    this.canvas.addEventListener('wheel', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;

      if (x > this.gameAreaWidth) {
        e.preventDefault();
        const scrollAmount = e.deltaY > 0 ? 35 : -35;
        const maxScroll = Math.max(0, (this.logs.length * 35) - (this.canvasHeight - 200));
        this.logScrollOffset = Math.max(0, Math.min(maxScroll, this.logScrollOffset + scrollAmount));
        this.render();
      }
    });
  }

  private getCursorAt(x: number, y: number): string {
    if (this.isSettingsOpen) return 'default';

    const allButtons = [...this.betAmountButtons];
    if (this.betButton) allButtons.push(this.betButton);
    if (this.cashOutButton) allButtons.push(this.cashOutButton);
    if (this.settingsButton) allButtons.push(this.settingsButton);
    if (this.backButton) allButtons.push(this.backButton);

    for (const button of allButtons) {
      if (button.visible && !button.disabled) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          return 'pointer';
        }
      }
    }
    return 'default';
  }

  private handleMouseDown(x: number, y: number) {
    if (this.isSettingsOpen) {
      const w = 500; const h = 450;
      const sx = (this.canvasWidth - w) / 2;
      const sy = (this.canvasHeight - h) / 2;

      const sliderY = sy + 140;
      const sliderX = sx + 50;
      const sliderW = 400;

      if (x >= sliderX && x <= sliderX + sliderW && y >= sliderY - 10 && y <= sliderY + 30) {
        this.isDraggingSlider = true;
        this.updateSliderValue(x, sliderX, sliderW);
      }
    }
  }

  private handleMouseUp() {
    this.isDraggingSlider = false;
  }

  private handleMouseMove(x: number, y: number) {
    if (this.isDraggingSlider && this.isSettingsOpen) {
      const w = 500;
      const sx = (this.canvasWidth - w) / 2;
      const sliderX = sx + 50;
      const sliderW = 400;

      this.updateSliderValue(x, sliderX, sliderW);
    }
  }

  private updateSliderValue(x: number, sliderX: number, sliderW: number) {
    const ratio = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
    let val = 1.0 + ratio * 9.0;
    if (val < 1.15) val = 0;
    this.autoCashout = val;
    this.render();
  }

  private handleClick(x: number, y: number) {
    if (this.isSettingsOpen) {
      const w = 500; const h = 450;
      const sx = (this.canvasWidth - w) / 2;
      const sy = (this.canvasHeight - h) / 2;

      // Close 버튼 (사각형)
      const closeBtnX = sx + w - 50;
      const closeBtnY = sy + 10;
      const closeBtnSize = 40;
      if (x >= closeBtnX && x <= closeBtnX + closeBtnSize && y >= closeBtnY && y <= closeBtnY + closeBtnSize) {
        this.isSettingsOpen = false;
        this.render();
        return;
      }

      // Auto Cashout 프리셋 버튼
      const presets = [
        { label: 'OFF', value: 0 },
        { label: '1.5x', value: 1.5 },
        { label: '2x', value: 2.0 },
        { label: '3x', value: 3.0 },
        { label: '5x', value: 5.0 }
      ];
      const presetBtnW = 70;
      const presetBtnH = 40;
      const presetGap = 10;
      const presetStartX = sx + 50;
      const presetStartY = sy + 190;

      presets.forEach((preset, i) => {
        const btnX = presetStartX + i * (presetBtnW + presetGap);
        if (x >= btnX && x <= btnX + presetBtnW && y >= presetStartY && y <= presetStartY + presetBtnH) {
          this.autoCashout = preset.value;
          this.render();
        }
      });

      // 속도 버튼 클릭
      const speeds = [
        { label: 'x1', value: 0.085 },
        { label: 'x2', value: 0.17 },
        { label: 'x3', value: 0.255 }
      ];
      const speedBtnW = 100;
      const speedBtnH = 45;
      const speedGap = 30;
      const speedStartX = sx + 100;
      const speedStartY = sy + 340;

      speeds.forEach((speed, i) => {
        const btnX = speedStartX + i * (speedBtnW + speedGap);
        if (x >= btnX && x <= btnX + speedBtnW && y >= speedStartY && y <= speedStartY + speedBtnH) {
          this.gameSpeed = speed.value;
          this.render();
        }
      });

      return;
    }

    let stateChanged = false;

    const allButtons = [...this.betAmountButtons];
    if (this.betButton) allButtons.push(this.betButton);
    if (this.cashOutButton) allButtons.push(this.cashOutButton);
    if (this.settingsButton) allButtons.push(this.settingsButton);
    if (this.backButton) allButtons.push(this.backButton);

    for (const button of allButtons) {
      if (button.visible && !button.disabled) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          button.onClick();
          stateChanged = true;
          break;
        }
      }
    }

    if (stateChanged) {
      this.updateButtonStates();
      if (!this.isRunning) this.render();
    }
  }

  private maxBet(): number {
    return Math.min(Math.floor(this.playerPoints), MAX_BET);
  }

  private createButtons() {
    const centerX = this.gameAreaWidth * 0.5;
    const bottomY = this.canvasHeight * 0.85;

    // 포인트 베팅 셀렉터: 누적 방식 (+100 / +500 / +1000 / MAX / CLR)
    const betSteps: { label: string; apply: () => void }[] = [
      { label: '+100', apply: () => { this.selectedBetAmount = Math.min(this.selectedBetAmount + 100, this.maxBet()); } },
      { label: '+500', apply: () => { this.selectedBetAmount = Math.min(this.selectedBetAmount + 500, this.maxBet()); } },
      { label: '+1000', apply: () => { this.selectedBetAmount = Math.min(this.selectedBetAmount + 1000, this.maxBet()); } },
      { label: 'MAX', apply: () => { this.selectedBetAmount = this.maxBet(); } },
      { label: 'CLR', apply: () => { this.selectedBetAmount = 0; } },
    ];

    const buttonWidth = this.gameAreaWidth * 0.15;
    const buttonHeight = (this.isMobile ? 40 : this.canvasHeight * 0.06);
    const buttonSpacing = this.gameAreaWidth * 0.02;

    const amountBtnWidth = buttonWidth * 0.8;
    const totalAmountWidth = betSteps.length * amountBtnWidth + (betSteps.length - 1) * buttonSpacing;
    const startX = centerX - totalAmountWidth / 2;

    this.betAmountButtons = betSteps.map((step, index) => ({
      x: startX + index * (amountBtnWidth + buttonSpacing),
      y: bottomY - (this.isMobile ? 60 : this.canvasHeight * 0.12),
      width: amountBtnWidth,
      height: buttonHeight,
      text: step.label,
      onClick: step.apply,
      visible: true,
    }));

    this.settingsButton = {
      x: this.gameAreaWidth - 60,
      y: 20,
      width: 40,
      height: 40,
      text: '⚙',
      onClick: () => {
        this.isSettingsOpen = !this.isSettingsOpen;
        this.render();
      },
      visible: true
    };

    this.backButton = {
      x: 20,
      y: 20,
      width: 50,
      height: 50,
      text: '◀',
      onClick: () => {
        window.history.back();
      },
      visible: true
    };

    const actionBtnW = (this.isMobile ? 120 : this.gameAreaWidth * 0.3);
    const actionBtnH = (this.isMobile ? 50 : this.canvasHeight * 0.08);

    this.betButton = {
      x: centerX - actionBtnW / 2,
      y: bottomY - (this.isMobile ? 10 : this.canvasHeight * 0.02),
      width: actionBtnW,
      height: actionBtnH,
      text: 'GAME START',
      onClick: () => this.startBet(),
      visible: false,
    };

    this.cashOutButton = {
      x: centerX - actionBtnW / 2,
      y: bottomY - (this.isMobile ? 10 : this.canvasHeight * 0.02),
      width: actionBtnW,
      height: actionBtnH,
      text: 'CASH OUT',
      onClick: () => this.cashOut(),
      visible: false,
    };
  }

  private updateButtonStates() {
    this.betAmountButtons.forEach(btn => {
      btn.visible = !this.isRunning && this.isGameEnded;
      btn.disabled = this.isProcessing;
    });

    if (this.betButton) {
      this.betButton.visible = !this.isRunning && this.isGameEnded && this.selectedBetAmount > 0;
      this.betButton.disabled = this.isProcessing;
    }

    if (this.cashOutButton) {
      this.cashOutButton.visible = this.isRunning && !this.hasCashedOut && !this.crashed;
      this.cashOutButton.disabled = this.isProcessing;
    }
  }

  private async startBet() {
    if (this.isRunning || this.isProcessing) return;

    if (this.selectedBetAmount === 0) {
      this.showMessage('베팅 금액을 선택해주세요!');
      return;
    }
    if (this.playerPoints < this.selectedBetAmount) {
      this.showMessage('포인트가 부족합니다!');
      return;
    }

    this.isProcessing = true;
    this.updateButtonStates();

    this.betAmount = this.selectedBetAmount;

    // 데모 모드: 서버 없이 로컬 진행
    if (this.isDemo) {
      this.gameSessionId = null;
      this.crashPoint = generateDemoCrashPoint();
      this.playerPoints -= this.betAmount;
      this.addLog('bet', `베팅: ${this.betAmount.toLocaleString()} P`, -this.betAmount, this.playerPoints);
      this.startGame();
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.showMessage('로그인이 필요합니다.');
      this.isProcessing = false;
      this.updateButtonStates();
      return;
    }

    try {
      // 서버에서 게임 시작 (베팅 + 크래시 포인트 생성)
      const response = await fetch('/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'start',
          betAmount: this.betAmount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.gameSessionId = data.sessionId;
        this.crashPoint = data.crashPoint; // 서버에서 받은 크래시 포인트
        this.playerPoints = data.points;
        this.addLog('bet', `베팅: ${this.betAmount.toLocaleString()} P`, -this.betAmount, data.points);
        this.startGame();
      } else {
        const errorData = await response.json();
        this.showMessage(errorData.error || '베팅에 실패했습니다.');
        this.isProcessing = false;
        this.updateButtonStates();
      }
    } catch (error) {
      console.error('Bet error:', error);
      this.showMessage('베팅 중 오류가 발생했습니다.');
      this.isProcessing = false;
      this.updateButtonStates();
    }
  }

  private stopAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startGame() {
    this.stopAnimation();

    this.isRunning = true;
    this.isProcessing = false;
    this.isGameEnded = false;
    this.crashed = false;
    this.hasCashedOut = false;
    this.multiplier = 1.0;
    this.startTime = Date.now();
    // crashPoint는 서버에서 이미 받아옴 (데모 모드는 로컬 생성)

    this.updateButtonStates();
    this.showMessage('게임시작 배당상승중');

    this.startLoop();
  }

  private async cashOut() {
    if (!this.isRunning || this.hasCashedOut || this.crashed || this.isProcessing) return;
    if (!this.isDemo && !this.gameSessionId) return;

    this.isProcessing = true;
    this.hasCashedOut = true;
    this.cashOutMultiplier = this.multiplier;

    this.updateButtonStates();
    this.showMessage(`캐시아웃! ${this.cashOutMultiplier.toFixed(2)}x (크래시 대기중...)`);

    // 데모 모드: 로컬 정산 (서버와 동일한 floor(bet × multiplier))
    if (this.isDemo) {
      const payout = Math.floor(this.betAmount * this.cashOutMultiplier);
      this.playerPoints += payout;
      const profit = payout - this.betAmount;
      this.addLog('win', `승리: ${this.cashOutMultiplier.toFixed(2)}x (+${profit} P)`, profit, this.playerPoints);
      this.isProcessing = false;
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.showMessage('로그인이 필요합니다.');
      this.isProcessing = false;
      return;
    }

    try {
      // 서버에서 캐시아웃 처리
      const response = await fetch('/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'cashout',
          sessionId: this.gameSessionId,
          multiplier: this.cashOutMultiplier,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.playerPoints = data.points;
        const profit = data.pointsChange;
        this.addLog('win', `승리: ${this.cashOutMultiplier.toFixed(2)}x (+${profit} P)`, profit, data.points);
      } else {
        const errorData = await response.json();
        this.showMessage(errorData.error || '캐시아웃 실패');
        this.hasCashedOut = false;
      }
    } catch (error) {
      console.error('Cash out error:', error);
      this.showMessage('네트워크 오류! 포인트가 지급되지 않았습니다.');
      this.hasCashedOut = false;
    }
    this.isProcessing = false;
  }

  private update() {
    if (this.crashed) {
      this.isRunning = false;
      return;
    }
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - this.startTime) / 1000;
    const nextMultiplier = Math.pow(Math.E, this.gameSpeed * elapsedSeconds);

    if (this.autoCashout > 1.05 && !this.crashed && !this.hasCashedOut && nextMultiplier >= this.autoCashout && this.isRunning) {
      this.cashOut();
    }

    if (nextMultiplier >= this.crashPoint) {
      this.handleCrash();
    } else {
      this.multiplier = nextMultiplier;
    }
  }

  private handleCrash() {
    this.crashed = true;
    this.isRunning = false;
    this.multiplier = this.crashPoint;

    // 크래시 히스토리에 추가 (최대 20개 유지)
    this.crashHistory.unshift(this.crashPoint);
    if (this.crashHistory.length > 20) {
      this.crashHistory.pop();
    }

    this.stopAnimation();
    this.updateButtonStates();
    this.processCrashResult().finally(() => {
      if (this.onRoundEnd) this.onRoundEnd();
    });
    this.render();

    setTimeout(() => {
      if ((this.canvas as any).__activeBustabitInstance === this.instanceId) {
        this.resetGame();
      }
    }, 5000);
  }

  private async processCrashResult() {
    if (this.hasCashedOut) {
      this.showMessage(`라운드 종료! ${this.crashPoint.toFixed(2)}x 에서 터졌습니다.`);
      this.gameSessionId = null;
      return;
    }

    // 데모 모드 패배: 로컬 처리 (베팅액은 이미 차감됨)
    if (this.isDemo) {
      this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, this.playerPoints);
      this.showMessage(`크래시! ${this.crashPoint.toFixed(2)}x`);
      return;
    }

    if (this.gameSessionId) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // 서버에서 크래시 처리
          const response = await fetch('/api/game/crash', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'crash',
              sessionId: this.gameSessionId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            this.playerPoints = data.points;
            this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, data.points);
          } else {
            this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, this.playerPoints);
          }
        } catch (error) {
          console.error('Settlement error:', error);
          this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, this.playerPoints);
        }
      } else {
        this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, this.playerPoints);
      }
    }
    this.showMessage(`크래시! ${this.crashPoint.toFixed(2)}x`);
    this.gameSessionId = null; // 세션 초기화
  }

  private resetGame(initial: boolean = false) {
    this.stopAnimation();

    this.isRunning = false;
    this.isGameEnded = true;
    this.crashed = false;
    this.hasCashedOut = false;
    this.multiplier = 1.0;
    this.gameSessionId = null; // 세션 초기화

    if (!initial) {
      this.showMessage('베팅하세요');
      // 데모 모드는 로컬 잔액 유지, 로그인 시 서버 잔액 재조회
      if (!this.isDemo) {
        this.loadUserPoints();
      }
    } else {
      this.showMessage('베팅 금액을 선택하고 게임을 시작하세요.');
    }

    // 직전 베팅액(selectedBetAmount)은 유지 → 라운드 사이에 그대로 재베팅하거나 변경 가능
    this.betAmount = 0;
    this.updateButtonStates();
    this.render();
  }

  private startLoop() {
    const animate = () => {
      if ((this.canvas as any).__activeBustabitInstance !== this.instanceId) {
        return;
      }

      if (!this.isRunning) return;

      this.update();
      this.render();

      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  public async start() {
    // 로딩 시작
    if (this.onLoadingProgress) {
      this.onLoadingProgress(10);
    }

    // 포인트 로딩
    await this.loadUserPoints();

    // 렌더링 시작
    this.render();
  }

  private render() {
    if ((this.canvas as any).__activeBustabitInstance !== this.instanceId) return;

    // 캐싱된 배경 사용
    if (this.staticCanvas) {
      this.ctx.drawImage(this.staticCanvas, 0, 0);
    } else {
      this.ctx.fillStyle = C.bg;
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    this.renderGameArea();
    this.renderSidebarContent();

    if (this.isSettingsOpen) {
      this.renderSettingsPanel();
    }
  }

  // 픽셀 패널/버튼 공용 드로잉 (플랫 컬러 + 3px 사각 테두리)
  private drawPixelRect(x: number, y: number, w: number, h: number, fill: string, border: string, borderWidth: number = 3) {
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(x, y, w, h);
    this.ctx.fillStyle = border;
    this.ctx.fillRect(x, y, w, borderWidth); // top
    this.ctx.fillRect(x, y + h - borderWidth, w, borderWidth); // bottom
    this.ctx.fillRect(x, y, borderWidth, h); // left
    this.ctx.fillRect(x + w - borderWidth, y, borderWidth, h); // right
  }

  private renderSettingsPanel() {
    const w = 500; const h = 450;
    const x = (this.canvasWidth - w) / 2;
    const y = (this.canvasHeight - h) / 2;

    // 반투명 배경 오버레이
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 설정 패널 (플랫 + 4px 테두리)
    this.drawPixelRect(x, y, w, h, C.panel, C.magenta, 4);

    // 타이틀
    this.ctx.fillStyle = C.cyan;
    this.ctx.font = `16px ${FONT_PIXEL}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.fillText('SETTINGS', x + w / 2, y + 50);

    // --- AUTO CASHOUT 섹션 ---
    this.drawPixelRect(x + 30, y + 80, w - 60, 150, C.bg, C.border, 2);

    this.ctx.fillStyle = C.yellow;
    this.ctx.font = `10px ${FONT_PIXEL}`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText('AUTO CASHOUT', x + 50, y + 110);

    const sliderY = y + 140;
    const sliderX = x + 50;
    const sliderW = 400;

    // 슬라이더 트랙
    this.ctx.fillStyle = C.border;
    this.ctx.fillRect(sliderX, sliderY + 5, sliderW, 10);

    // 활성 영역 (진행바)
    const ratio = this.autoCashout <= 1.0 ? 0 : (this.autoCashout - 1.0) / 9.0;
    const handleX = sliderX + ratio * sliderW;

    if (ratio > 0) {
      this.ctx.fillStyle = C.cyan;
      this.ctx.fillRect(sliderX, sliderY + 5, handleX - sliderX, 10);
    }

    // 슬라이더 핸들 (사각 픽셀)
    this.drawPixelRect(handleX - 10, sliderY - 2, 20, 24, C.white, this.autoCashout > 1.0 ? C.cyan : C.dim, 3);

    // 현재 값 표시
    this.ctx.fillStyle = C.white;
    this.ctx.font = `12px ${FONT_PIXEL}`;
    this.ctx.textAlign = 'center';
    const valText = this.autoCashout <= 1.05 ? 'OFF' : `${this.autoCashout.toFixed(2)}x`;
    this.ctx.fillText(valText, x + w / 2, y + 180);

    // 프리셋 버튼들
    const presets = [
      { label: 'OFF', value: 0 },
      { label: '1.5x', value: 1.5 },
      { label: '2x', value: 2.0 },
      { label: '3x', value: 3.0 },
      { label: '5x', value: 5.0 }
    ];
    const presetBtnW = 70;
    const presetBtnH = 40;
    const presetGap = 10;
    const presetStartX = x + 50;
    const presetStartY = y + 190;

    presets.forEach((preset, i) => {
      const btnX = presetStartX + i * (presetBtnW + presetGap);
      const isActive = Math.abs(this.autoCashout - preset.value) < 0.01;

      this.drawPixelRect(btnX, presetStartY, presetBtnW, presetBtnH, isActive ? C.cyan : C.panel, isActive ? C.white : C.border, 3);

      this.ctx.fillStyle = isActive ? '#000000' : C.dim;
      this.ctx.font = `9px ${FONT_PIXEL}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(preset.label, btnX + presetBtnW / 2, presetStartY + presetBtnH / 2 + 1);
      this.ctx.textBaseline = 'alphabetic';
    });

    // --- GAME SPEED 섹션 ---
    this.drawPixelRect(x + 30, y + 260, w - 60, 130, C.bg, C.border, 2);

    this.ctx.fillStyle = C.lime;
    this.ctx.font = `10px ${FONT_PIXEL}`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText('GAME SPEED', x + 50, y + 290);

    const speeds = [
      { label: 'x1', value: 0.085 },
      { label: 'x2', value: 0.17 },
      { label: 'x3', value: 0.255 }
    ];
    const speedBtnW = 100;
    const speedBtnH = 45;
    const speedGap = 30;
    const speedStartX = x + 100;
    const speedStartY = y + 340;

    speeds.forEach((speed, i) => {
      const btnX = speedStartX + i * (speedBtnW + speedGap);
      const isSelected = Math.abs(this.gameSpeed - speed.value) < 0.01;

      this.drawPixelRect(btnX, speedStartY, speedBtnW, speedBtnH, isSelected ? C.lime : C.panel, isSelected ? C.white : C.border, 3);

      this.ctx.fillStyle = isSelected ? '#000000' : C.dim;
      this.ctx.font = `12px ${FONT_PIXEL}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(speed.label, btnX + speedBtnW / 2, speedStartY + speedBtnH / 2 + 1);
      this.ctx.textBaseline = 'alphabetic';
    });

    // Close 버튼 (사각형)
    const closeBtnX = x + w - 50;
    const closeBtnY = y + 10;
    const closeBtnSize = 40;

    this.drawPixelRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, C.magenta, C.white, 3);

    this.ctx.fillStyle = C.white;
    this.ctx.font = `14px ${FONT_PIXEL}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('X', closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2 + 1);
    this.ctx.textBaseline = 'alphabetic';
  }

  private renderGameArea() {
    const padding = 60;
    const graphWidth = this.gameAreaWidth - padding * 2;
    const graphHeight = this.canvasHeight - padding * 2;
    const originX = padding;
    const originY = this.canvasHeight - padding;

    const renderMultiplier = this.crashed ? this.crashPoint : this.multiplier;

    const currentMaxY = Math.max(2.0, renderMultiplier * 1.1);
    const currentRequiredTime = Math.log(currentMaxY) / this.gameSpeed;
    const timeMaxX = Math.max(6.0, currentRequiredTime);

    this.drawGrid(originX, originY, graphWidth, graphHeight, currentMaxY);

    if (this.isRunning || this.crashed || this.hasCashedOut || (this.isGameEnded && this.multiplier > 1.0)) {
      this.drawGraphCurve(originX, originY, graphWidth, graphHeight, currentMaxY, timeMaxX);
    }

    this.drawStatusText();
    this.renderUI();
    this.renderButtons();
    this.renderCrashHistory();
  }

  // 라운드 크래시 히스토리 → 픽셀 칩 행 (lime ≥2.0 / yellow ≥1.5 / magenta <1.5)
  private renderCrashHistory() {
    if (this.crashHistory.length === 0) return;

    const startX = 80;
    const boxWidth = 56;
    const boxHeight = 26;
    const gap = 4;
    const startY = this.canvasHeight - 42;

    const maxFit = Math.max(1, Math.floor((this.gameAreaWidth - startX - 20) / (boxWidth + gap)));
    const displayHistory = this.crashHistory.slice(0, Math.min(15, maxFit));

    this.ctx.font = `7px ${FONT_PIXEL}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    displayHistory.forEach((crash, i) => {
      const x = startX + i * (boxWidth + gap);

      let color: string = C.magenta;
      if (crash >= 2.0) color = C.lime;
      else if (crash >= 1.5) color = C.yellow;

      this.drawPixelRect(x, startY, boxWidth, boxHeight, C.panel, color, 2);

      this.ctx.fillStyle = color;
      this.ctx.fillText(`x${crash.toFixed(2)}`, x + boxWidth / 2, startY + boxHeight / 2 + 1);
    });

    this.ctx.textBaseline = 'alphabetic';
  }

  private renderSidebarContent() {
    if (this.sidebarWidth === 0) return;

    const startX = this.gameAreaWidth;

    // 배경/타이틀은 staticCanvas에 이미 그려져 있음. 로그만 렌더링.
    const logStartY = 80;
    const logEndY = this.canvasHeight - 20;
    let currentY = logStartY - this.logScrollOffset;
    const rowHeight = 35;

    this.logs.forEach((log) => {
      if (currentY + rowHeight < logStartY || currentY > logEndY) {
        currentY += rowHeight;
        return;
      }

      if (log.type === 'bet') this.ctx.fillStyle = C.yellow;
      else if (log.type === 'win') this.ctx.fillStyle = C.lime;
      else if (log.type === 'lose') this.ctx.fillStyle = C.magenta;
      else this.ctx.fillStyle = C.dim;

      this.ctx.font = `12px ${FONT_KR}`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'alphabetic';

      this.ctx.globalAlpha = 0.5;
      this.ctx.fillText(`[${log.time}]`, startX + 20, currentY);
      this.ctx.globalAlpha = 1.0;

      let logText = log.message;
      if (log.pointsChange !== undefined && log.balance !== undefined) {
        const changeText = log.pointsChange >= 0 ? `+${log.pointsChange.toLocaleString()}` : log.pointsChange.toLocaleString();
        logText += ` (${changeText} P, 잔액: ${log.balance.toLocaleString()} P)`;
      }

      this.ctx.fillText(logText, startX + 90, currentY);
      currentY += rowHeight;
    });
  }

  private drawGrid(ox: number, oy: number, w: number, h: number, maxY: number) {
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.font = `8px ${FONT_PIXEL}`;
    this.ctx.fillStyle = C.dim;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const val = 1 + (maxY - 1) * ratio;
      const y = oy - h * ratio;
      this.ctx.beginPath();
      this.ctx.moveTo(ox, y);
      this.ctx.lineTo(ox + w, y);
      this.ctx.stroke();
      this.ctx.fillText(`${val.toFixed(2)}x`, ox - 8, y);
    }
    // 축
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
    this.ctx.beginPath();
    this.ctx.moveTo(ox, oy);
    this.ctx.lineTo(ox, oy - h);
    this.ctx.moveTo(ox, oy);
    this.ctx.lineTo(ox + w, oy);
    this.ctx.stroke();
    this.ctx.textBaseline = 'alphabetic';
  }

  // 청키한 계단식 픽셀 그래프 라인 (4px, cyan / 캐시아웃 lime / 크래시 magenta)
  private drawGraphCurve(ox: number, oy: number, w: number, h: number, maxY: number, maxX: number) {
    const px = 4; // 픽셀 단위

    let color: string = C.cyan;
    if (this.crashed) color = C.magenta;
    else if (this.hasCashedOut) color = C.lime;
    this.ctx.fillStyle = color;

    const targetMultiplier = this.crashed ? this.crashPoint : this.multiplier;
    const drawTime = Math.log(targetMultiplier) / this.gameSpeed;

    const lastX = ox + (drawTime / maxX) * w;
    const lastY = oy - ((targetMultiplier - 1) / (maxY - 1)) * h;

    let prevQy: number | null = null;
    for (let x = ox; x <= lastX; x += px) {
      const t = ((x - ox) / w) * maxX;
      const m = Math.pow(Math.E, this.gameSpeed * t);
      const y = oy - ((m - 1) / (maxY - 1)) * h;
      const qy = Math.round(y / px) * px;

      this.ctx.fillRect(x, qy - px, px, px);
      // 계단 사이 세로 연결 (가파른 구간)
      if (prevQy !== null && Math.abs(qy - prevQy) > px) {
        const top = Math.min(qy, prevQy);
        this.ctx.fillRect(x, top - px, px, Math.abs(qy - prevQy) + px);
      }
      prevQy = qy;
    }

    // 끝점 마커 (사각 픽셀)
    const qx = Math.round(lastX / px) * px;
    const qy = Math.round(lastY / px) * px;
    if (this.crashed) {
      // 크래시 순간: magenta 버스트 플래시
      this.ctx.fillStyle = C.magenta;
      this.ctx.fillRect(qx - 12, qy - 12, 24, 24);
      this.ctx.fillStyle = C.white;
      this.ctx.fillRect(qx - 6, qy - 6, 12, 12);
    } else {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(qx - 6, qy - 6, 12, 12);
    }
  }

  private drawStatusText() {
    if (this.isGameEnded && !this.crashed && !this.isRunning) return;

    const centerX = this.gameAreaWidth / 2;
    const centerY = this.canvasHeight / 2 - 50;
    const sf = this.scaleFactor;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = `${Math.max(20, Math.floor(48 * sf))}px ${FONT_PIXEL}`;

    const displayMult = this.crashed ? this.crashPoint : this.multiplier;

    if (this.crashed) {
      this.ctx.fillStyle = C.magenta;
      this.ctx.fillText(`${displayMult.toFixed(2)}x`, centerX, centerY);
      this.ctx.font = `${Math.max(12, Math.floor(20 * sf))}px ${FONT_PIXEL}`;
      this.ctx.fillText('CRASHED', centerX, centerY + 60);
    } else if (this.hasCashedOut) {
      this.ctx.fillStyle = C.lime;
      this.ctx.fillText(`${this.multiplier.toFixed(2)}x`, centerX, centerY);
      this.ctx.font = `${Math.max(10, Math.floor(14 * sf))}px ${FONT_PIXEL}`;
      this.ctx.fillStyle = C.white;
      this.ctx.fillText(`CASHED OUT @ ${this.cashOutMultiplier.toFixed(2)}x`, centerX, centerY + 60);
    } else if (this.isRunning) {
      this.ctx.fillStyle = C.cyan;
      this.ctx.fillText(`${displayMult.toFixed(2)}x`, centerX, centerY);
    }
    this.ctx.textBaseline = 'alphabetic';
  }

  private renderUI() {
    // 잔액 / 현재 베팅액 표시 (좌상단)
    this.ctx.font = `10px ${FONT_PIXEL}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';

    this.ctx.fillStyle = C.lime;
    this.ctx.fillText(`POINTS ${this.playerPoints.toLocaleString()}`, 85, 35);

    if (this.selectedBetAmount > 0 && !this.crashed) {
      this.ctx.fillStyle = C.yellow;
      this.ctx.fillText(`BET ${this.selectedBetAmount.toLocaleString()}`, 85, 58);
    }

    if (this.isDemo) {
      this.ctx.fillStyle = C.dim;
      this.ctx.fillText('DEMO', 85, 81);
    }
  }

  private renderButtons() {
    // 설정 버튼 (항상 표시)
    if (this.settingsButton) {
      this.drawPixelRect(this.settingsButton.x, this.settingsButton.y, this.settingsButton.width, this.settingsButton.height, C.panel, C.cyan, 3);
      this.ctx.font = `20px ${FONT_KR}`;
      this.ctx.fillStyle = C.cyan;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.settingsButton.text, this.settingsButton.x + this.settingsButton.width / 2, this.settingsButton.y + this.settingsButton.height / 2 + 1);
      this.ctx.textBaseline = 'alphabetic';
    }

    // 뒤로가기 버튼 (사각 픽셀)
    if (this.backButton) {
      this.drawPixelRect(this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, C.panel, C.magenta, 3);
      this.ctx.font = `16px ${FONT_PIXEL}`;
      this.ctx.fillStyle = C.magenta;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.backButton.text, this.backButton.x + this.backButton.width / 2, this.backButton.y + this.backButton.height / 2 + 1);
      this.ctx.textBaseline = 'alphabetic';
    }

    // 베팅 셀렉터 버튼
    this.betAmountButtons.forEach(button => {
      if (button.visible) {
        this.drawButton(button, button.disabled ? C.border : C.panel, C.cyan, C.cyan);
      }
    });

    if (this.betButton && this.betButton.visible) {
      this.drawButton(this.betButton, this.betButton.disabled ? C.border : C.lime, C.white, '#000000');
    }

    if (this.cashOutButton && this.cashOutButton.visible) {
      this.drawButton(this.cashOutButton, this.cashOutButton.disabled ? C.border : C.yellow, C.white, '#000000');
    }
  }

  // 픽셀 버튼: 플랫 컬러 + 3px 테두리, 각진 모서리 (그라데이션/라운드/그림자 없음)
  private drawButton(button: Button, fill: string, border: string, textColor: string) {
    this.drawPixelRect(button.x, button.y, button.width, button.height, fill, border, 3);

    this.ctx.fillStyle = button.disabled ? C.dim : textColor;
    const fontSize = Math.max(8, Math.min(14, Math.floor(button.height * 0.28)));
    this.ctx.font = `${fontSize}px ${FONT_PIXEL}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2 + 1);
    this.ctx.textBaseline = 'alphabetic';
  }

  destroy() {
    this.stopAnimation();
  }
}
