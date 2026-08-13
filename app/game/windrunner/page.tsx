'use client'

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, X } from 'lucide-react'
import WindRunnerLeaderboard from '@/components/game/WindRunnerLeaderboard'

// Phaser는 클라이언트 사이드에서만 로드해야 함
const PhaserGame = dynamic(() => Promise.resolve(GameComponent), { ssr: false })

export default function WindRunnerPage() {
    const [myBestScore, setMyBestScore] = useState(0);

    // 그래픽 품질 상태
    const [quality, setQuality] = useState<'low' | 'mid' | 'high'>('high');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        // 로컬 스토리지에서 내 최고 기록 로드
        const savedScore = localStorage.getItem('windrunner_highscore');
        if (savedScore) {
            setMyBestScore(parseInt(savedScore));
        }

        // 품질 설정 로드
        const savedQuality = localStorage.getItem('windrunner_quality');
        if (savedQuality && ['low', 'mid', 'high'].includes(savedQuality)) {
            setQuality(savedQuality as any);
        }
    }, []);

    const handleGameOver = async (score: number) => {
        const finalScore = Math.floor(score);

        // 로컬 최고 기록 업데이트
        if (finalScore > myBestScore) {
            setMyBestScore(finalScore);
            localStorage.setItem('windrunner_highscore', finalScore.toString());
        }

        // 서버에 점수 저장 (로그인한 사용자만)
        const token = localStorage.getItem('token');
        if (token) {
            try {
                await fetch('/api/game/score', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        gameType: 'windrunner',
                        score: finalScore
                    })
                })
            } catch (error) {
                console.error('Score save failed', error)
            }
        }
    };

    const changeQuality = (q: 'low' | 'mid' | 'high') => {
        setQuality(q);
        localStorage.setItem('windrunner_quality', q);
        setIsSettingsOpen(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 relative overflow-hidden">
            {/* Background Stars Effect (CSS only for UI depth) */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
                <div className="absolute w-[2px] h-[2px] bg-white rounded-full top-10 left-20 animate-pulse"></div>
                <div className="absolute w-[3px] h-[3px] bg-purple-400 rounded-full top-40 left-80 animate-pulse delay-75"></div>
                <div className="absolute w-[2px] h-[2px] bg-blue-400 rounded-full top-20 left-[60%] animate-pulse delay-150"></div>
            </div>

            {/* Header Buttons */}
            <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
                <Link href="/game">
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:text-cyan-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
            </div>

            {/* Settings Button */}
            <div className="absolute top-6 right-6 z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:text-cyan-400 transition-colors"
                >
                    {isSettingsOpen ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </Button>

                {/* Settings Modal */}
                {isSettingsOpen && (
                    <div className="absolute top-12 right-0 w-48 bg-[#0f172a]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-top-2">
                        <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Graphics Quality</div>
                        <div className="space-y-2">
                            {[
                                { id: 'high', label: 'HIGH (화려함)' },
                                { id: 'mid', label: 'MID (균형)' },
                                { id: 'low', label: 'LOW (최적화)' }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => changeQuality(opt.id as any)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${quality === opt.id
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                            : 'text-slate-300 hover:bg-white/5'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <h1 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10 italic tracking-tighter">
                SPACE RUNNER
            </h1>

            <div className="flex flex-col lg:flex-row gap-8 items-start z-10 mt-4">
                {/* Game Container */}
                <div className="relative rounded-2xl overflow-hidden border-4 border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.1)] w-[800px] h-[600px] bg-[#020617] order-1 lg:order-2">
                    {/* Key를 변경하여 quality 변경 시 컴포넌트 리마운트 -> 게임 재시작 */}
                    <PhaserGame key={quality} quality={quality} onGameOver={handleGameOver} />
                </div>
            </div>

            {/* Game Specific Leaderboard - 무한계단 스타일 */}
            <WindRunnerLeaderboard />

            <p className="mt-6 text-slate-400 z-10 flex items-center gap-2 text-sm">
                <span className="bg-white/10 px-2 py-0.5 rounded text-yellow-400 font-bold border border-white/10">CLICK</span>
                <span className="text-xs">OR</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-yellow-400 font-bold border border-white/10">SPACE</span>
                <span className="text-xs text-slate-500">TO JUMP (DOUBLE JUMP OK)</span>
            </p>
        </div>
    )
}

interface GameComponentProps {
    quality: 'low' | 'mid' | 'high';
    onGameOver?: (score: number) => void;
}

const GameComponent = ({ quality, onGameOver }: GameComponentProps) => {
    const gameRef = useRef<Phaser.Game | null>(null)
    const parentRef = useRef<HTMLDivElement>(null)

    const onGameOverRef = useRef(onGameOver);
    useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

    useEffect(() => {
        if (!parentRef.current || gameRef.current) return

        import('phaser').then((PhaserModule) => {
            const Phaser = PhaserModule.default || PhaserModule;

            class MainScene extends Phaser.Scene {
                private gameSpeed: number = 350;
                private jumpForce: number = 600;
                private gravity: number = 1500;
                private score: number = 0;

                private player!: Phaser.Physics.Arcade.Sprite;
                private platforms!: Phaser.Physics.Arcade.Group;
                private stars!: Phaser.Physics.Arcade.Group;
                private spikes!: Phaser.Physics.Arcade.Group;
                private boosts!: Phaser.Physics.Arcade.Group;
                private bgStars: { obj: Phaser.GameObjects.Shape, speed: number }[] = [];
                private planets: Phaser.GameObjects.Container[] = [];
                private galaxy: Phaser.GameObjects.Graphics | null = null;

                private jumps: number = 0;
                private isGameOver: boolean = false;
                private isBoosting: boolean = false;
                private originalGameSpeed: number = 0;
                private nextPlatformDistance: number = 0;

                private lastPlatformY: number = 400;

                private scoreText!: Phaser.GameObjects.Text;
                private gameOverText!: Phaser.GameObjects.Text;

                constructor() {
                    super({ key: 'MainScene' })
                }

                preload() {
                    this.createPlayerRunTexture('player_run_1', 0);
                    this.createPlayerRunTexture('player_run_2', 1);

                    // Graphics for basic objects
                    const groundG = this.make.graphics({ x: 0, y: 0 });
                    groundG.fillStyle(0x1e293b, 1);
                    groundG.fillRect(0, 0, 100, 40);
                    groundG.fillStyle(0x334155, 1);
                    groundG.fillRect(0, 0, 100, 4);
                    groundG.lineStyle(2, 0x0ea5e9);
                    groundG.strokeRect(0, 0, 100, 40);
                    groundG.fillStyle(0x0f172a, 0.5);
                    groundG.beginPath();
                    groundG.moveTo(20, 40);
                    groundG.lineTo(40, 4);
                    groundG.lineTo(60, 40);
                    groundG.fillPath();
                    groundG.generateTexture('ground', 100, 40);

                    const starG = this.make.graphics({ x: 0, y: 0 });
                    starG.fillStyle(0xfacc15, 1);
                    starG.beginPath();
                    starG.moveTo(15, 0);
                    starG.lineTo(30, 15);
                    starG.lineTo(15, 30);
                    starG.lineTo(0, 15);
                    starG.closePath();
                    starG.fillPath();
                    starG.fillStyle(0xffffff, 0.8);
                    starG.fillCircle(15, 15, 5);
                    starG.generateTexture('star', 30, 30);

                    const spikeG = this.make.graphics({ x: 0, y: 0 });
                    spikeG.fillStyle(0xf43f5e, 1);
                    spikeG.beginPath();
                    spikeG.moveTo(0, 40);
                    spikeG.lineTo(20, 0);
                    spikeG.lineTo(40, 40);
                    spikeG.closePath();
                    spikeG.fillPath();
                    spikeG.fillStyle(0xffffff, 0.3);
                    spikeG.beginPath();
                    spikeG.moveTo(0, 40);
                    spikeG.lineTo(20, 0);
                    spikeG.lineTo(20, 40);
                    spikeG.closePath();
                    spikeG.fillPath();
                    spikeG.generateTexture('spike', 40, 40);

                    // 5. 부스트 (초록색 번개)
                    const boostG = this.make.graphics({ x: 0, y: 0 });
                    boostG.fillStyle(0x00ff00, 1);
                    boostG.beginPath();
                    boostG.moveTo(20, 0);
                    boostG.lineTo(0, 20);
                    boostG.lineTo(15, 20);
                    boostG.lineTo(10, 40);
                    boostG.lineTo(30, 20);
                    boostG.lineTo(15, 20);
                    boostG.lineTo(20, 0);
                    boostG.closePath();
                    boostG.fillPath();

                    // 빛나는 효과
                    boostG.lineStyle(2, 0xffffff);
                    boostG.strokePath();
                    boostG.generateTexture('boost', 30, 40);
                }

                createPlayerRunTexture(key: string, type: number) {
                    const playerG = this.make.graphics({ x: 0, y: 0 });
                    playerG.fillStyle(0xffffff, 1);
                    playerG.fillCircle(25, 12, 10);
                    playerG.fillStyle(0x38bdf8, 1);
                    playerG.fillCircle(30, 12, 5);
                    playerG.fillStyle(0xffffff, 1);
                    playerG.fillRoundedRect(15, 20, 20, 25, 5);
                    playerG.fillStyle(0x94a3b8, 1);
                    playerG.fillRoundedRect(5, 22, 10, 20, 2);
                    playerG.lineStyle(6, 0xffffff);

                    if (type === 0) {
                        playerG.beginPath(); playerG.moveTo(25, 25); playerG.lineTo(35, 35); playerG.strokePath();
                        playerG.beginPath(); playerG.moveTo(25, 25); playerG.lineTo(15, 20); playerG.strokePath();
                        playerG.beginPath(); playerG.moveTo(25, 45); playerG.lineTo(35, 55); playerG.strokePath();
                        playerG.beginPath(); playerG.moveTo(25, 45); playerG.lineTo(15, 40); playerG.strokePath();
                    } else {
                        playerG.beginPath(); playerG.moveTo(25, 25); playerG.lineTo(35, 20); playerG.strokePath();
                        playerG.beginPath(); playerG.moveTo(25, 25); playerG.lineTo(15, 35); playerG.strokePath();
                        playerG.beginPath(); playerG.moveTo(25, 45); playerG.lineTo(35, 40); playerG.strokePath();
                        playerG.beginPath(); playerG.moveTo(25, 45); playerG.lineTo(15, 55); playerG.strokePath();
                    }
                    playerG.generateTexture(key, 50, 60);
                }

                create() {
                    this.isGameOver = false;
                    this.score = 0;
                    this.gameSpeed = 350;
                    this.jumps = 0;
                    this.lastPlatformY = 500;

                    this.cameras.main.setBackgroundColor('#050510');

                    // 1. 성운 (High Only)
                    if (quality === 'high') {
                        this.createNebula();
                        this.createGalaxy();
                    }

                    // 2. 행성 (Mid or High)
                    if (quality !== 'low') {
                        this.createPlanets();
                    }

                    // 3. 별 (품질별 개수 조정)
                    this.createStars();

                    this.anims.create({
                        key: 'run',
                        frames: [
                            { key: 'player_run_1' },
                            { key: 'player_run_2' }
                        ],
                        frameRate: 8,
                        repeat: -1
                    });

                    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
                    this.stars = this.physics.add.group({ allowGravity: false, immovable: true });
                    this.spikes = this.physics.add.group({ allowGravity: false, immovable: true });
                    this.boosts = this.physics.add.group({ allowGravity: false, immovable: true });

                    this.addPlatform(0, 500, 15);

                    this.player = this.physics.add.sprite(100, 300, 'player_run_1');
                    this.player.play('run');

                    this.player.setGravityY(this.gravity);
                    this.player.setBodySize(30, 50);
                    this.player.setOffset(10, 5);

                    this.physics.world.setBounds(0, 0, 800, 600, true, true, false, false);
                    this.player.setCollideWorldBounds(true);

                    this.physics.add.collider(this.player, this.platforms, this.resetJump, undefined, this);
                    this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);
                    this.physics.add.overlap(this.player, this.spikes, this.hitObstacle, undefined, this);
                    this.physics.add.overlap(this.player, this.boosts, this.collectBoost, undefined, this);

                    this.input.on('pointerdown', this.jump, this);
                    if (this.input.keyboard) {
                        this.input.keyboard.on('keydown-SPACE', this.jump, this);
                        this.input.keyboard.on('keydown-R', () => this.scene.restart());
                    }

                    this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
                        fontSize: '24px', fontFamily: "'Galmuri11', monospace", color: '#0ea5e9', fontStyle: 'bold',
                    }).setDepth(10);

                    this.gameOverText = this.add.text(400, 250, 'GAME OVER', {
                        fontSize: '48px', fontFamily: 'Arial Black', color: '#ef4444',
                        stroke: '#fff', strokeThickness: 6
                    }).setOrigin(0.5).setVisible(false).setDepth(20);
                }

                createNebula() {
                    // 부드러운 성운 효과
                    for (let i = 0; i < 5; i++) {
                        const x = Phaser.Math.Between(0, 800);
                        const y = Phaser.Math.Between(0, 600);
                        const radius = Phaser.Math.Between(200, 500);
                        const color = Phaser.Utils.Array.GetRandom([0x4b0082, 0x800080, 0x00008b, 0x191970]);
                        const nebula = this.add.circle(x, y, radius, color, 0.05);
                        nebula.setScrollFactor(0);
                    }
                }

                createGalaxy() {
                    // 은하수 (대각선 흐름)
                    this.galaxy = this.add.graphics();
                    this.galaxy.setScrollFactor(0);

                    // 보라색/핑크색 그라데이션 라인
                    this.galaxy.fillGradientStyle(0x000000, 0x000000, 0x9400d3, 0x4b0082, 0.1);
                    this.galaxy.beginPath();
                    this.galaxy.moveTo(0, 400);
                    this.galaxy.lineTo(800, 100);
                    this.galaxy.lineTo(800, 300);
                    this.galaxy.lineTo(0, 600);
                    this.galaxy.closePath();
                    this.galaxy.fillPath();

                    // 반짝이 입자 추가
                    for (let i = 0; i < 50; i++) {
                        const x = Phaser.Math.Between(0, 800);
                        const y = Phaser.Math.Between(0, 600);
                        // 대각선 영역 근처에만 생성
                        if (Math.abs((x + y) - 800) < 300) {
                            const star = this.add.circle(x, y, 1, 0xff00ff, 0.3);
                            this.tweens.add({
                                targets: star,
                                alpha: 0.8,
                                duration: Phaser.Math.Between(1000, 3000),
                                yoyo: true,
                                repeat: -1
                            });
                        }
                    }
                }

                createPlanets() {
                    if (quality === 'high') {
                        // High: 거대 행성 + 작은 행성
                        const p1 = this.add.circle(700, 150, 80, 0xff6347);
                        p1.setAlpha(0.8);
                        p1.setScrollFactor(0.02);

                        const r1 = this.add.ellipse(700, 150, 240, 50);
                        r1.setStrokeStyle(4, 0xdeb887, 0.4);
                        r1.setRotation(0.5);
                        r1.setScrollFactor(0.02);

                        const p2 = this.add.circle(200, 500, 150, 0x4169e1, 0.3);
                        p2.setScrollFactor(0.01);
                    } else {
                        // Mid: 작은 행성 1개만
                        const p2 = this.add.circle(700, 150, 50, 0x4169e1, 0.6);
                        p2.setScrollFactor(0.02);
                    }
                }

                createStars() {
                    let starCount = 20; // Low (50 -> 20)
                    if (quality === 'mid') starCount = 100; // Mid (150 -> 100)
                    if (quality === 'high') starCount = 250; // High (300 -> 250)

                    // 원경 별
                    for (let i = 0; i < starCount; i++) {
                        const x = Phaser.Math.Between(0, 800);
                        const y = Phaser.Math.Between(0, 600);
                        const size = Phaser.Math.FloatBetween(0.5, 1.5);
                        const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.1, 0.5));
                        this.bgStars.push({ obj: star, speed: 0.05 });
                    }

                    // 근경 별 (High일 때만 추가)
                    if (quality === 'high') {
                        for (let i = 0; i < 50; i++) {
                            const x = Phaser.Math.Between(0, 800);
                            const y = Phaser.Math.Between(0, 600);
                            const size = Phaser.Math.FloatBetween(2, 3);
                            const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.5, 1));
                            this.bgStars.push({ obj: star, speed: 0.2 });
                        }
                    }
                }

                // 오브젝트 풀링을 위한 도우미 함수: 화면 밖으로 나간 객체 비활성화
                deactivateObject(group: Phaser.Physics.Arcade.Group, limitX: number) {
                    group.children.iterate((child: any) => {
                        if (child.active) {
                            child.x -= this.gameSpeed * 0.016;
                            // 부스트 아이템 애니메이션
                            if (group === this.boosts) {
                                child.angle += 5;
                                child.scale = 1 + Math.sin(this.time.now / 100) * 0.1;
                            }
                            // 별 회전 애니메이션
                            if (group === this.stars) {
                                child.angle += 2;
                            }

                            if (child.x < limitX) {
                                child.disableBody(true, true); // 비활성화 및 숨김
                            }
                        }
                        return true;
                    });
                }

                update() {
                    if (this.isGameOver) return;

                    // 배경 별 이동 (이미 재사용 중)
                    this.bgStars.forEach(item => {
                        item.obj.x -= this.gameSpeed * 0.016 * item.speed;
                        if (item.obj.x < 0) item.obj.x = 800;
                    });

                    const dt = 0.016;
                    const moveDist = this.gameSpeed * dt;

                    // 물리 객체 업데이트 및 정리 (Object Pooling 적용)
                    this.deactivateObject(this.platforms, -100);
                    this.deactivateObject(this.stars, -50);
                    this.deactivateObject(this.spikes, -50);
                    this.deactivateObject(this.boosts, -50);

                    this.nextPlatformDistance -= moveDist;
                    if (this.nextPlatformDistance <= 0) {
                        this.spawnRandomSection();
                    }

                    if (this.player.y > 650) {
                        this.hitObstacle();
                    }

                    // 점수 증가
                    this.score += this.isBoosting ? 0.3 : 0.1;
                    this.scoreText.setText(`SCORE: ${Math.floor(this.score)}`);

                    if (!this.isBoosting) {
                        this.gameSpeed = Math.min(800, this.gameSpeed + 0.05);
                    }
                }

                jump() {
                    if (this.isGameOver) {
                        if (this.gameOverText.visible) this.scene.restart();
                        return;
                    }

                    if (this.player.body?.touching.down || this.jumps < 2) {
                        this.player.setVelocityY(-this.jumpForce);
                        this.jumps++;

                        this.player.stop();

                        this.tweens.add({
                            targets: this.player,
                            angle: this.player.angle + 360,
                            duration: 500,
                            ease: 'Cubic.out',
                        });
                    }
                }

                resetJump() {
                    if (this.tweens.isTweening(this.player)) {
                        this.tweens.killTweensOf(this.player);
                    }

                    if (this.player.angle !== 0 || !this.player.anims.isPlaying) {
                        this.player.setAngle(0);
                        this.player.play('run', true);
                    }

                    this.jumps = 0;
                }

                spawnRandomSection() {
                    const difficulty = Math.min(this.score / 2000, 1);

                    const widthCount = Phaser.Math.Between(4, 10 - Math.floor(difficulty * 3));
                    const gapBase = 180 + (difficulty * 100);
                    const gap = Phaser.Math.Between(gapBase, gapBase + 150);

                    const heightRange = 150 + (difficulty * 100);

                    let yChange = Phaser.Math.Between(-heightRange, heightRange);
                    if (Math.random() < 0.2 && this.lastPlatformY > 300) {
                        yChange = -200;
                    }

                    let y = this.lastPlatformY + yChange;
                    y = Phaser.Math.Clamp(y, 100, 550);

                    const startX = 850;

                    this.addPlatform(startX, y, widthCount);

                    const arcHeight = Math.min(this.lastPlatformY, y) - 150;
                    this.addArcStars(startX - gap, this.lastPlatformY, startX, y, gap);

                    // 아이템 생성 (별, 장애물, 부스트)
                    const itemRoll = Math.random();
                    const centerX = startX + (widthCount * 100) / 2;

                    if (itemRoll < 0.1) {
                        // 10% 확률로 부스트 생성
                        this.addBoost(centerX, y - 50);
                    } else if (itemRoll < 0.3 + (difficulty * 0.4)) {
                        // 장애물 생성
                        this.addSpike(centerX, y - 20);
                    }

                    this.lastPlatformY = y;
                    this.nextPlatformDistance = gap + (widthCount * 100);
                }

                addArcStars(x1: number, y1: number, x2: number, y2: number, gapWidth: number) {
                    const starCount = 5;
                    const stepX = gapWidth / (starCount + 1);

                    const jumpApex = Math.min(y1, y2) - 150;

                    for (let i = 1; i <= starCount; i++) {
                        const t = i / (starCount + 1);

                        const curX = x1 + (stepX * i);
                        const controlY = jumpApex - 50;

                        const curY = Math.pow(1 - t, 2) * y1 +
                            2 * (1 - t) * t * controlY +
                            Math.pow(t, 2) * y2;

                        const star = this.stars.get(curX, curY, 'star');
                        if (star) {
                            star.setActive(true).setVisible(true);
                            star.enableBody(true, curX, curY, true, true);
                            star.setBodySize(20, 20);
                            star.setAngle(0);
                        }
                    }
                }

                addPlatform(x: number, y: number, widthCount: number) {
                    for (let i = 0; i < widthCount; i++) {
                        const platform = this.platforms.get(x + (i * 100), y, 'ground');
                        if (platform) {
                            platform.setActive(true).setVisible(true);
                            platform.enableBody(true, x + (i * 100), y, true, true);
                            platform.setOrigin(0, 0);
                            platform.refreshBody();
                        }
                    }
                }

                addSpike(x: number, y: number) {
                    const spike = this.spikes.get(x, y, 'spike');
                    if (spike) {
                        spike.setActive(true).setVisible(true);
                        spike.enableBody(true, x, y, true, true);
                        spike.setOrigin(0.5, 1);
                        spike.setBodySize(20, 30);
                        spike.setOffset(10, 10);
                    }
                }

                addBoost(x: number, y: number) {
                    const boost = this.boosts.get(x, y, 'boost');
                    if (boost) {
                        boost.setActive(true).setVisible(true);
                        boost.enableBody(true, x, y, true, true);
                        boost.setOrigin(0.5, 1);
                        boost.setBodySize(30, 40);
                        boost.setScale(1);
                        boost.setAngle(0);
                    }
                }

                collectStar(player: any, star: any) {
                    star.disableBody(true, true);
                    this.score += 100;
                    this.scoreText.setText(`SCORE: ${Math.floor(this.score)}`);

                    this.tweens.add({
                        targets: this.scoreText,
                        scale: 1.3,
                        duration: 100,
                        yoyo: true
                    });
                }

                collectBoost(player: any, boost: any) {
                    boost.disableBody(true, true);

                    if (this.isBoosting) return; // 이미 부스트 중이면 무시

                    this.isBoosting = true;
                    this.originalGameSpeed = this.gameSpeed;
                    this.gameSpeed = this.gameSpeed * 3; // 속도 3배

                    // 시각적 효과
                    this.cameras.main.shake(200, 0.005);
                    this.cameras.main.flash(200, 0x00ff00, 0.5); // 초록색 섬광

                    // 플레이어 무적 효과 (반투명 + 색상)
                    this.player.setAlpha(0.7);
                    this.player.setTint(0x00ff00);

                    // 속도선 효과 추가 (Graphics) - Low 품질이 아닐 때만
                    let speedLines: Phaser.GameObjects.Graphics | null = null;
                    let lineEvent: Phaser.Time.TimerEvent | null = null;

                    if (quality !== 'low') {
                        speedLines = this.add.graphics();
                        speedLines.setScrollFactor(0);
                        const drawLines = () => {
                            if (!speedLines) return;
                            speedLines.clear();
                            speedLines.lineStyle(2, 0xffffff, 0.5);
                            for (let i = 0; i < 10; i++) {
                                const lx = Phaser.Math.Between(0, 800);
                                const ly = Phaser.Math.Between(0, 600);
                                speedLines.moveTo(lx, ly);
                                speedLines.lineTo(lx - 100, ly);
                            }
                            speedLines.strokePath();
                        };

                        // 매 프레임 선 그리기 이벤트
                        lineEvent = this.time.addEvent({ delay: 50, callback: drawLines, loop: true });
                    }

                    // 3초 후 복귀
                    this.time.delayedCall(3000, () => {
                        this.isBoosting = false;
                        this.gameSpeed = this.originalGameSpeed; // 원래 속도로 복귀 (점진적 증가분 무시하고 일단 복귀)
                        this.player.clearTint();
                        this.player.setAlpha(1);

                        if (lineEvent) lineEvent.destroy();
                        if (speedLines) {
                            speedLines.clear();
                            speedLines.destroy();
                        }
                    });
                }

                hitObstacle() {
                    if (this.isGameOver) return;

                    // 부스트 중이면 장애물 무시 (무적)
                    // 단, 낙사(y > 650)는 hitObstacle을 호출하므로 여기서 구분해야 함
                    if (this.isBoosting && this.player.y < 600) {
                        return;
                    }

                    this.isGameOver = true;
                    this.physics.pause();
                    this.player.setTint(0xff4444);
                    this.player.stop();

                    const finalScore = Math.floor(this.score);
                    this.gameOverText.setVisible(true);
                    this.gameOverText.setText(`GAME OVER\nScore: ${finalScore}\nClick to Restart`);

                    if (onGameOverRef.current) {
                        onGameOverRef.current(finalScore);
                    }
                }
            }

            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 800,
                height: 600,
                parent: parentRef.current,
                backgroundColor: '#020617',
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { y: 0, x: 0 },
                        debug: false
                    }
                },
                scene: [MainScene]
            }

            gameRef.current = new Phaser.Game(config)
        });

        return () => {
            gameRef.current?.destroy(true)
            gameRef.current = null
        }
    }, [quality])

    return <div ref={parentRef} className="w-full h-full" />
}
