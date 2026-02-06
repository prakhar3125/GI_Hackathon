# ============================================================
# ENHANCED ORDER INTENT PARSER
# ============================================================

import re
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass

@dataclass
class OrderIntent:
    """Structured representation of parsed order intent"""
    urgency_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    algo_strategy: Optional[str]  # VWAP, TWAP, POV, ICEBERG, None
    execution_style: str  # PASSIVE, NEUTRAL, AGGRESSIVE
    session_target: Optional[str]  # CAS, OPENING, CLOSING, None
    deadline_time: Optional[str]  # HH:MM format
    must_complete: bool
    price_sensitivity: str  # MINIMIZE_IMPACT, STANDARD, URGENT_FILL
    explicit_instructions: List[str]
    confidence_score: float  # 0.0 to 1.0


class OrderIntentParser:
    """
    Advanced parser for unstructured order notes.
    Handles combinations like "urgent - passive - closing auction"
    """
    
    # Keyword patterns organized by category
    URGENCY_PATTERNS = {
        'CRITICAL': [
            r'\basap\b', r'\bimmediate\b', r'\bcritic', r'\brush\b',
            r'\bextreme\s*urgency\b', r'\bfast\s*as\s*possible\b'
        ],
        'HIGH': [
            r'\burgent\b', r'\beod\s*compliance\b', r'\bmust\s*complete\b',
            r'\bhigh\s*priority\b', r'\btime[\s-]sensitive\b'
        ],
        'LOW': [
            r'\bpassive\b', r'\bpatient\b', r'\bno\s*rush\b', 
            r'\bno\s*urgency\b', r'\brelaxed\b', r'\bwork\s*it\b'
        ]
    }
    
    ALGO_PATTERNS = {
        'VWAP': [r'\bvwap\b', r'\bvolume[\s-]weighted\b', r'\bbenchmark\s*vwap\b'],
        'TWAP': [r'\btwap\b', r'\btime[\s-]weighted\b'],
        'POV': [r'\bpov\b', r'\bparticipation\b', r'\bpercentage\s*of\s*volume\b'],
        'ICEBERG': [r'\biceberg\b', r'\bhide\s*size\b', r'\bdark\s*pool\b']
    }
    
    EXECUTION_STYLE_PATTERNS = {
        'PASSIVE': [
            r'\bpassive\b', r'\bavoid\s*impact\b', r'\bminimize\s*impact\b',
            r'\bminimize\s*market\s*impact\b', r'\bpatient\b', r'\bwork\b'
        ],
        'AGGRESSIVE': [
            r'\baggressive\b', r'\bcross\s*spread\b', r'\btake\s*liquidity\b',
            r'\bimmediate\s*fill\b'
        ]
    }
    
    SESSION_PATTERNS = {
        'CAS': [
            r'\bcas\b', r'\bclosing\s*auction\b', r'\bclose\s*auction\b',
            r'\bauction\s*close\b', r'\bat\s*close\b'
        ],
        'OPENING': [
            r'\bopening\s*auction\b', r'\bopen\s*auction\b', r'\bat\s*open\b'
        ],
        'CLOSING': [
            r'\bclosing\b(?!\s*auction)', r'\bby\s*close\b', r'\btoward\s*close\b'
        ]
    }
    
    COMPLETION_PATTERNS = [
        r'\bmust\s*complete\b', r'\bensure\s*complete\b', r'\bguarantee\s*fill\b',
        r'\bget\s*done\b', r'\bcomplete\s*by\b', r'\bfill\s*or\s*kill\b'
    ]
    
    # Common neutral/standard phrases to ignore
    NEUTRAL_PATTERNS = [
        r'\bstandard\s*order\b', r'\bexecute\s*normally\b', 
        r'\bno\s*special\s*instructions\b', r'\bregular\b'
    ]
    
    @classmethod
    def parse(cls, notes: str) -> OrderIntent:
        """
        Main parsing method - extracts all dimensions from notes
        """
        if not notes:
            return cls._create_default_intent()
        
        notes_lower = notes.lower().strip()
        
        # Check if it's a neutral/standard order first
        is_standard = cls._match_any_pattern(notes_lower, cls.NEUTRAL_PATTERNS)
        
        return OrderIntent(
            urgency_level=cls._extract_urgency(notes_lower, is_standard),
            algo_strategy=cls._extract_algo(notes_lower, is_standard),
            execution_style=cls._extract_execution_style(notes_lower, is_standard),
            session_target=cls._extract_session_target(notes_lower),
            deadline_time=cls._extract_deadline(notes_lower),
            must_complete=cls._extract_must_complete(notes_lower),
            price_sensitivity=cls._extract_price_sensitivity(notes_lower, is_standard),
            explicit_instructions=cls._extract_explicit_instructions(notes_lower),
            confidence_score=cls._calculate_confidence(notes_lower, is_standard)
        )
    
    @classmethod
    def _extract_urgency(cls, notes: str, is_standard: bool) -> str:
        """Extract urgency level with conflict resolution"""
        if is_standard:
            return 'MEDIUM'
        
        # Check from highest to lowest priority
        for level in ['CRITICAL', 'HIGH', 'LOW']:
            if cls._match_any_pattern(notes, cls.URGENCY_PATTERNS.get(level, [])):
                return level
        
        return 'MEDIUM'
    
    @classmethod
    def _extract_algo(cls, notes: str, is_standard: bool) -> Optional[str]:
        """Extract algo strategy"""
        if is_standard:
            return None
        
        # First check for minimize/avoid impact (maps to ICEBERG)
        if re.search(r'\b(minimize|avoid)\s*(market\s*)?impact\b', notes):
            # Unless VWAP is explicitly mentioned
            if not cls._match_any_pattern(notes, cls.ALGO_PATTERNS['VWAP']):
                return 'ICEBERG'
        
        # Check explicit algo mentions
        for algo, patterns in cls.ALGO_PATTERNS.items():
            if cls._match_any_pattern(notes, patterns):
                return algo
        
        return None
    
    @classmethod
    def _extract_execution_style(cls, notes: str, is_standard: bool) -> str:
        """Extract execution style"""
        if is_standard:
            return 'NEUTRAL'
        
        if cls._match_any_pattern(notes, cls.EXECUTION_STYLE_PATTERNS['PASSIVE']):
            return 'PASSIVE'
        elif cls._match_any_pattern(notes, cls.EXECUTION_STYLE_PATTERNS['AGGRESSIVE']):
            return 'AGGRESSIVE'
        
        return 'NEUTRAL'
    
    @classmethod
    def _extract_session_target(cls, notes: str) -> Optional[str]:
        """Extract session target"""
        for session, patterns in cls.SESSION_PATTERNS.items():
            if cls._match_any_pattern(notes, patterns):
                return session
        return None
    
    @classmethod
    def _extract_deadline(cls, notes: str) -> Optional[str]:
        """Extract deadline time from patterns like 'by 2 pm', 'vwap by 14:00'"""
        # Pattern 1: "by X pm/am"
        match = re.search(r'by\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)', notes)
        if match:
            hour = int(match.group(1))
            minute = match.group(2) or '00'
            period = match.group(3)
            
            if period == 'pm' and hour != 12:
                hour += 12
            elif period == 'am' and hour == 12:
                hour = 0
            
            return f"{hour:02d}:{minute}"
        
        # Pattern 2: "by HH:MM" or "until HH:MM"
        match = re.search(r'(?:by|until)\s*(\d{1,2}):(\d{2})', notes)
        if match:
            hour = int(match.group(1))
            minute = match.group(2)
            return f"{hour:02d}:{minute}"
        
        return None
    
    @classmethod
    def _extract_must_complete(cls, notes: str) -> bool:
        """Check if order must be completed"""
        return cls._match_any_pattern(notes, cls.COMPLETION_PATTERNS)
    
    @classmethod
    def _extract_price_sensitivity(cls, notes: str, is_standard: bool) -> str:
        """Determine price sensitivity level"""
        if is_standard:
            return 'STANDARD'
        
        if re.search(r'\b(minimize|avoid)\s*(market\s*)?impact\b', notes):
            return 'MINIMIZE_IMPACT'
        elif re.search(r'\b(urgent|asap|immediate|critical)\b', notes):
            return 'URGENT_FILL'
        
        return 'STANDARD'
    
    @classmethod
    def _extract_explicit_instructions(cls, notes: str) -> List[str]:
        """Extract explicit trader instructions as tags"""
        instructions = []
        
        # Check for common explicit instructions
        patterns = {
            'NO_CROSS_SPREAD': r'\bdo\s*not\s*cross\b',
            'LIMIT_ONLY': r'\blimit\s*only\b',
            'NO_MARKET': r'\bno\s*market\s*orders?\b',
            'BENCHMARK': r'\bbenchmark\b',
            'WORK_ORDER': r'\bwork\s*(the\s*)?order\b',
            'PARTICIPATE': r'\bparticipate\b',
            'DISCRETION': r'\buse\s*discretion\b'
        }
        
        for tag, pattern in patterns.items():
            if re.search(pattern, notes):
                instructions.append(tag)
        
        return instructions
    
    @classmethod
    def _calculate_confidence(cls, notes: str, is_standard: bool) -> float:
        """
        Calculate confidence score based on clarity of instructions
        """
        if not notes or len(notes) < 5:
            return 0.3
        
        if is_standard:
            return 0.95  # Very confident about standard orders
        
        confidence = 0.5  # Base confidence
        
        # Boost for explicit algo mentions
        if cls._match_any_pattern(notes, 
            cls.ALGO_PATTERNS['VWAP'] + cls.ALGO_PATTERNS['TWAP']):
            confidence += 0.2
        
        # Boost for clear urgency
        if cls._match_any_pattern(notes, 
            cls.URGENCY_PATTERNS['CRITICAL'] + cls.URGENCY_PATTERNS['HIGH']):
            confidence += 0.15
        
        # Boost for session targets
        if cls._extract_session_target(notes):
            confidence += 0.15
        
        # Reduce for conflicting signals
        if (cls._match_any_pattern(notes, cls.URGENCY_PATTERNS['CRITICAL']) and
            cls._match_any_pattern(notes, cls.URGENCY_PATTERNS['LOW'])):
            confidence -= 0.2
        
        return min(max(confidence, 0.0), 1.0)
    
    @classmethod
    def _match_any_pattern(cls, text: str, patterns: List[str]) -> bool:
        """Check if text matches any of the regex patterns"""
        return any(re.search(pattern, text) for pattern in patterns)
    
    @classmethod
    def _create_default_intent(cls) -> OrderIntent:
        """Create default intent for empty notes"""
        return OrderIntent(
            urgency_level='MEDIUM',
            algo_strategy=None,
            execution_style='NEUTRAL',
            session_target=None,
            deadline_time=None,
            must_complete=False,
            price_sensitivity='STANDARD',
            explicit_instructions=[],
            confidence_score=0.5
        )