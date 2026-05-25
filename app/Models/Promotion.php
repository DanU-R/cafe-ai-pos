<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class Promotion extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'type',
        'promo_type',
        'target_id',
        'value',
        'minimum_spend',
        'starts_at',
        'ends_at',
        'start_time',
        'end_time',
        'active_days',
        'is_active',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function discountFor(float $subtotal): float
    {
        if ($subtotal < (float) $this->minimum_spend) {
            return 0;
        }

        $discount = $this->type === 'percent'
            ? $subtotal * (float) $this->value / 100
            : (float) $this->value;

        return round(min($discount, $subtotal), 2);
    }

    /**
     * @param  Collection<int, array{product_id:int, category_id:int|null, price:float, qty:int, subtotal:float}>  $lines
     */
    public function discountForLines(Collection $lines, ?CarbonInterface $now = null): float
    {
        $now ??= now();

        if (! $this->isEligibleNow($now)) {
            return 0;
        }

        $eligibleLines = $this->eligibleLines($lines);
        $eligibleSubtotal = (float) $eligibleLines->sum('subtotal');

        if ($eligibleSubtotal < (float) $this->minimum_spend) {
            return 0;
        }

        if ($this->promo_type === 'bogo') {
            return $this->bogoDiscount($eligibleLines);
        }

        return $this->discountFor($eligibleSubtotal);
    }

    public function isEligibleNow(CarbonInterface $now): bool
    {
        if ($this->promo_type !== 'happy_hour') {
            return true;
        }

        $activeDays = collect($this->active_days ?? [])->map(fn (string $day): string => strtolower($day));

        if ($activeDays->isNotEmpty() && ! $activeDays->contains(strtolower($now->englishDayOfWeek))) {
            return false;
        }

        if ($this->start_time && $now->format('H:i:s') < $this->start_time) {
            return false;
        }

        if ($this->end_time && $now->format('H:i:s') > $this->end_time) {
            return false;
        }

        return true;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $lines
     * @return Collection<int, array<string, mixed>>
     */
    private function eligibleLines(Collection $lines): Collection
    {
        if ($this->promo_type === 'product_specific') {
            return $lines->where('product_id', (int) $this->target_id)->values();
        }

        if ($this->promo_type === 'category_specific') {
            return $lines->where('category_id', (int) $this->target_id)->values();
        }

        if ($this->promo_type === 'bogo' && $this->target_id) {
            return $lines->filter(fn (array $line): bool => $line['product_id'] === (int) $this->target_id || $line['category_id'] === (int) $this->target_id)->values();
        }

        return $lines;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $lines
     */
    private function bogoDiscount(Collection $lines): float
    {
        $unitPrices = $lines
            ->flatMap(fn (array $line): array => array_fill(0, $line['qty'], (float) $line['price']))
            ->sort()
            ->values();
        $freeUnits = intdiv($unitPrices->count(), 2);
        $discount = (float) $unitPrices->take($freeUnits)->sum();

        return round(min($discount, (float) $lines->sum('subtotal')), 2);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_id' => 'integer',
            'value' => 'decimal:2',
            'minimum_spend' => 'decimal:2',
            'starts_at' => 'date',
            'ends_at' => 'date',
            'active_days' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
