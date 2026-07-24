import random
from art import *

def deal_cards():
    '''Return a random card from the deck'''
    cards = [11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10]
    card = random.choice(cards)
    return card
def calculate_score(hand):
    '''Takes the list of cards and return the scores calculated from the hand'''
    if sum(hand) == 21 and len(hand) == 2:
        return 0
    if 11 in hand and sum(hand)>21:
        hand.remove(11)
        hand.append(1)
    '''Return the score of the hand'''

    return sum(hand)

def compare(p_hand_score, d_hand_score):
    '''Compare the scores of two hands'''
    if p_hand_score == d_hand_score:
        return "Draw"
    elif d_hand_score ==0:
        return 'Lose, Opponent Has Blackjack'
    elif p_hand_score==0:
        return 'WIN WITH A BLACKJACK :)'
    elif p_hand_score > 21:
        return 'You went over, you LOSE :('
    elif d_hand_score>21:
        return 'Dealer went over, you win :)'
    elif p_hand_score>d_hand_score:
        return 'You win'
    else:
        return 'You Lose'
def play_game():
    '''Play the game'''
    tprint("BLACKJACK")
    # print(logo)
    user_cards = []
    dealer_card = []
    dealer_score = -1
    player_score = -1
    is_game_over = False
    for _ in range(2):

        user_cards.append(deal_cards())
        dealer_card.append(deal_cards())
    while not is_game_over:
        player_score = calculate_score(user_cards)
        dealer_score = calculate_score(dealer_card)
        print(f'Your cards: {user_cards} and your score: {player_score}\n')
        print(f'Dealer cards: {dealer_card[0]} ')
        if player_score ==0 or dealer_score==0 or player_score>21:
            is_game_over = True
        else:
            user_should_deal = input('Type y to get another card, type n to end game\n').lower()
            if user_should_deal == 'y':
                user_cards.append(deal_cards())
            else:
                is_game_over = True

    while dealer_score !=0 and dealer_score<17:
        dealer_card.append(deal_cards())
        dealer_score = calculate_score(dealer_card)

    print(f'Your final cards: {user_cards} and your final score: {player_score}\n')
    print(f'Dealer final cards: {dealer_card} and the final score: {dealer_score}\n')
    print(compare(player_score, dealer_score))
while input('\n press n if you do not want to play again or any key to continue \n').lower()!='n':
    play_game()