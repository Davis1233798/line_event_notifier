import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/services/parser';

describe('Command Parser', () => {
    it('should parse bind command', () => {
        const result = parseCommand('!綁定 user1');
        expect(result).toEqual({
            type: '綁定',
            args: ['user1'],
            rawText: '!綁定 user1'
        });
    });

    it('should parse bind command with fullwidth exclamation', () => {
        const result = parseCommand('！綁定 user1');
        expect(result).toEqual({
            type: '綁定',
            args: ['user1'],
            rawText: '！綁定 user1'
        });
    });

    it('should parse command with extra spaces', () => {
        const result = parseCommand('!綁定   user1  ');
        expect(result).toEqual({
            type: '綁定',
            args: ['user1'],
            rawText: '!綁定   user1  '
        });
    });

    it('should ignore non-command messages', () => {
        expect(parseCommand('你好')).toBeNull();
        expect(parseCommand('綁定 user1')).toBeNull(); // Missing !
    });

    it('should parse english bind command', () => {
        const result = parseCommand('!bind user1');
        expect(result).toEqual({
            type: '綁定',
            args: ['user1'],
            rawText: '!bind user1'
        });
    });

    it('should parse bind command without space', () => {
        const result = parseCommand('!綁定user1');
        expect(result).toEqual({
            type: '綁定',
            args: ['user1'],
            rawText: '!綁定user1'
        });
    });

    it('should parse bind command with fullwidth exclamation and no space', () => {
        const result = parseCommand('！綁定user1');
        expect(result).toEqual({
            type: '綁定',
            args: ['user1'],
            rawText: '！綁定user1'
        });
    });

    it('should parse test reminder command', () => {
        const result = parseCommand('!測試提醒');
        expect(result).toEqual({
            type: '測試提醒',
            args: [],
            rawText: '!測試提醒'
        });
    });
});
